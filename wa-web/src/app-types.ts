import { DocumentData, DocumentReference, Timestamp } from 'firebase/firestore'

export interface FirebaseStickerDocument extends DocumentData {
  addTime: Timestamp
  keywords:string[]
  modifiedTime:Timestamp
  url:string
}
export interface FirebasePackDocument extends DocumentData{
  icon: DocumentReference<FirebaseStickerDocument>
  stickers: DocumentReference<FirebaseStickerDocument>[]
}
export interface ISticker {
  id:string
  url:string
  keywords:string[]
}
export interface IPack {
  id:string
  icon: ISticker
  stickers:DocumentReference<FirebaseStickerDocument>[]
}
