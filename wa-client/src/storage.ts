import * as firebase from 'firebase-admin'
import { v4 as generateUuid } from 'uuid'
/*
firebase.initializeApp({
  credential: firebase.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS || '')),
  storageBucket: 'gs://sticker-whatsapp-manager.appspot.com'
})
*/
const bucket = firebase.storage().bucket()
const { projectId } = firebase.app().options.credential as firebase.ServiceAccount

export async function uploadSticker (buffer:Buffer, id:string):Promise<string> {
  const storagePath = `${id}.webp`
  const storageFile = bucket.file(storagePath)
  await storageFile.save(buffer)

  const uuid = generateUuid()
  await storageFile.setMetadata({
    metadata: {
      firebaseStorageDownloadTokens: uuid
    }
  })

  return `https://firebasestorage.googleapis.com/v0/b/${projectId}.appspot.com/o/${encodeURIComponent(
    storagePath
  )}?alt=media&token=${uuid}`
}
