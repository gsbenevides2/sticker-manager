// eslint-disable-next-line no-use-before-define
import React from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, query, orderBy, getDocs, where, doc, updateDoc, serverTimestamp, deleteDoc, CollectionReference, getDoc, arrayUnion, arrayRemove, addDoc } from 'firebase/firestore'
import { getStorage, ref, deleteObject } from 'firebase/storage'
import { FirebasePackDocument, FirebaseStickerDocument, IPack, ISticker } from './app-types'

const firebaseConfig = {
  apiKey: 'AIzaSyCCLGLXUQ0nOWLCstGucO2QVt2Gal8kf10',
  authDomain: 'sticker-manager-whatsapp.firebaseapp.com',
  projectId: 'sticker-manager-whatsapp',
  storageBucket: 'sticker-manager-whatsapp.appspot.com',
  messagingSenderId: '118540647726',
  appId: '1:118540647726:web:cc99390e2f2fa07c8e4ebf'
}
const app = initializeApp(firebaseConfig)
const firestore = getFirestore(app)
const storage = getStorage(app)
const stickersCollection = collection(firestore, 'stickers') as CollectionReference<FirebaseStickerDocument>
const packsCollection = collection(firestore, 'packs') as CollectionReference<FirebasePackDocument>

const serverUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : ''

function App () {
  const [showStickerModal, setStickerModal] = React.useState(false)
  const [showSelectedModal, setSelectedModal] = React.useState(false)
  const [stickers, setStickers] = React.useState<ISticker[]>([])
  const [loading, setLoading] = React.useState(true)
  const [modalSticker, setModalSticker] = React.useState<ISticker>()
  const [packs, setPacks] = React.useState<IPack[]>([])
  const [selectedPack, setSelectedPack] = React.useState('all')

  async function loadStickers () {
    const docs = await getDocs(query(stickersCollection, orderBy('modifiedTime', 'desc')))
    const stickers:ISticker[] = []
    docs.forEach(doc => {
      const data = doc.data()
      stickers.push({ id: doc.id, url: data.url, keywords: data.keywords })
    })
    setStickers(stickers)
    setLoading(false)
  }
  async function loadPacks () {
    const docs = await getDocs(packsCollection)
    const packs = await Promise.all(docs.docs.map(async pack => {
      const data = pack.data()
      const iconSnapshot = await getDoc(data.icon)
      const iconData = iconSnapshot.data()
      if (iconData?.url) {
        const icon = { id: iconSnapshot.id, url: iconData.url, keywords: iconData.keywords }
        return {
          id: pack.id,
          icon,
          stickers: data.stickers
        }
      } else {
        const stickers = await Promise.all(data.stickers.map(async sticker => {
          const stickerSnapshot = await getDoc(sticker)
          const dataSticker = stickerSnapshot.data()
          if (dataSticker?.url) return { id: stickerSnapshot.id, url: dataSticker.url, keywords: dataSticker.keywords }
          else {
            await updateDoc(pack.ref, {
              stickers: arrayRemove(sticker)
            })
            return null
          }
        }))
        const t = stickers.filter(sticker => sticker) as ISticker[]
        const icon = t[0]
        if (icon) {
          await updateDoc(pack.ref, {
            icon: doc(stickersCollection, icon.id)
          })

          return {
            id: pack.id,
            icon,
            stickers: data.stickers
          }
        } else {
          await deleteDoc(pack.ref)
        }
      }
    }))
    setPacks(packs.filter(pack => pack) as IPack[])
  }

  const restartWAConection = React.useCallback(async () => {
    await fetch(`${serverUrl}/reconnect`)
    alert('Sistemas reconectados')
  }, [])

  const search = React.useCallback(async (input:React.KeyboardEvent<HTMLInputElement>) => {
    if (!input.currentTarget.value) {
      setLoading(true)
      loadStickers()
    } else if (input.key === 'Enter') {
      setLoading(true)
      const searchKeywords = input.currentTarget.value.toLocaleLowerCase().split(', ')
      const docs = await getDocs(query(stickersCollection, where('keywords', 'array-contains-any', searchKeywords), orderBy('modifiedTime', 'desc')))
      const stickers:ISticker[] = []
      docs.forEach(doc => {
        const data = doc.data()
        stickers.push({ id: doc.id, url: data.url, keywords: data.keywords })
      })
      console.log(stickers)
      setStickers(stickers)
      setLoading(false)
    }
  }, [])

  const openModalAndCreatePack = React.useCallback(async (sticker:ISticker) => {
    if (selectedPack === 'create') {
      setLoading(true)
      await addDoc(packsCollection, {
        icon: doc(stickersCollection, sticker.id),
        stickers: [doc(stickersCollection, sticker.id)]
      })
      await loadPacks()
      setLoading(false)
    } else {
      setStickerModal(true)
      setModalSticker(sticker)
    }
  }, [selectedPack])
  const editKeywords = React.useCallback(async () => {
    setLoading(true)
    const keywords = window.prompt('Palavras Chave:', modalSticker?.keywords.join(', '))?.toLocaleLowerCase().split(', ') || []
    await updateDoc(
      doc(stickersCollection, modalSticker?.id || ''),
      { modifiedTime: serverTimestamp(), keywords }
    )
    const newSticker = {
      id: '',
      url: '',
      ...modalSticker,
      keywords
    }
    setModalSticker(newSticker)
    setStickerModal(true)
    setStickers([newSticker, ...stickers.filter(sticker => sticker.id !== modalSticker?.id)])
    setLoading(false)
  }, [stickers, modalSticker])
  const deleteSticker = React.useCallback(async () => {
    if (!window.confirm('Você tem certeza que deseja deletar?')) return
    setLoading(true)
    await deleteDoc(
      doc(stickersCollection, modalSticker?.id || '')
    )
    await deleteObject(
      ref(storage, `${modalSticker?.id}.webp`)
    )
    await loadPacks()
    setStickers(stickers.filter(sticker => sticker.id !== modalSticker?.id))
    setLoading(false)
  }, [modalSticker, stickers])
  const sendSticker = React.useCallback(async () => {
    await fetch(`${serverUrl}/sendSticker?url=${modalSticker?.url}`)
    alert('Sticker Enviado')
    setStickerModal(true)
  }, [modalSticker])
  const addToPack = React.useCallback(async (packId:string) => {
    setLoading(true)
    const docRef = doc(packsCollection, packId)
    const stickerRef = doc(stickersCollection, modalSticker?.id)
    await updateDoc(docRef, {
      stickers: arrayUnion(stickerRef)
    })
    await loadPacks()
    setLoading(false)
  }, [modalSticker])

  const loadStickersOfPack = React.useCallback(async (packId:string) => {
    setLoading(true)
    setSelectedPack(packId)
    if (packId === 'all') await loadStickers()
    else if (packId === 'create') setLoading(false)
    else {
      const pack = packs.find(pack => pack.id === packId)
      if (pack) {
        const stickers = await Promise.all(pack.stickers.map(async sticker => {
          const stickerSnapshot = await getDoc(sticker)
          const data = stickerSnapshot.data()
          if (data?.url) return { id: stickerSnapshot.id, url: data.url, keywords: data.keywords }
          else {
            return null
          }
        }))
        const t = stickers.filter(sticker => sticker) as ISticker[]
        setStickers(t)
      }
    }
    setLoading(false)
  }, [packs])

  React.useEffect(() => {
    loadPacks()
    loadStickers()
  }, [])

  return (
    <>
    <h1 onClick={restartWAConection}>Gerenciador de Stickers</h1>
    <div className="procurar-div">
      <input onKeyUp={search} id='procurar' placeholder="Encontrar um sticker"/>
    </div>
    <ul className="sticker-collection-bar">
      <li
      onClick={() => { loadStickersOfPack('all') }}
      className={selectedPack === 'all' ? 'selected' : ''}>
        <span>🕓</span>
      </li>
      {packs.map(pack => (
        <li
        key={pack.id}
        className={selectedPack === pack.id ? 'selected' : ''}
        onClick={() => { loadStickersOfPack(pack.id) }}>
          <img src={pack.icon.url} />
        </li>
      ))}
      <li
       onClick={() => { loadStickersOfPack('create') }}
       className={selectedPack === 'create' ? 'selected' : ''}><span>➕</span></li>
    </ul>
    {loading && (
    <div className="warn">
      <div className="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <span>Carregando Stickers!<br/>Aguarde...</span>
    </div>
    )}
    {(!loading && stickers.length)
      ? (
      <ul id="list">
      {stickers.map(sticker => (
        <li key={sticker.id} onClick={() => openModalAndCreatePack(sticker)}><img src={sticker.url}/></li>
      ))}
      </ul>
        )
      : null }
    {stickers.length === 0 && !loading && (
      <div className="warn">
        <div className="lds-ripple"><div></div><div></div></div>
        <span>Não foram encontrados stickers!</span>
      </div>
    )}
    {showStickerModal && (
    <div id="modal" onClick={() => setStickerModal(false)}>
      <div className='modal-content'>
        <img src={modalSticker?.url}/>
        <p>Palavras-Chave:{modalSticker?.keywords.join(', ')}</p>
        <button onClick={sendSticker}>Enviar no Whatsapp</button>
        <button onClick={deleteSticker}>Deletar Sticker</button>
        <button onClick={editKeywords}>Editar Palavras Chave</button>
        <button onClick={() => setSelectedModal(true)}>Adicionar a um pack</button>
      </div>
    </div>
    )}
    {showSelectedModal && (
    <div id="modal" onClick={() => setSelectedModal(false)}>
      <div className='modal-content modal-pack-select'>
        <h4>Escolha um pack:</h4>
        <ul id="list">
        {packs.map(pack => (
          <li key={pack.id} onClick={() => addToPack(pack.id)}><img src={pack.icon.url}/></li>
        ))}
      </ul>
      </div>
    </div>
    )}
    </>
  )
}

export default App
