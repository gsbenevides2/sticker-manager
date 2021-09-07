import * as firebase from 'firebase-admin'

firebase.initializeApp({
  credential: firebase.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS || '')),
  storageBucket: 'gs://sticker-manager-whatsapp.appspot.com'
})

export async function createStickerDocument ():Promise<string> {
  const doc = await firebase.firestore().collection('stickers').add({
    addTime: firebase.firestore.FieldValue.serverTimestamp(),
    modifiedTime: firebase.firestore.FieldValue.serverTimestamp(),
    keywords: []
  })
  return doc.id
}

export async function saveStickerUrl (url:string, id:string):Promise<void> {
  await firebase.firestore().collection('stickers').doc(id).update({
    modifiedTime: firebase.firestore.FieldValue.serverTimestamp(),
    url: url
  })
}
