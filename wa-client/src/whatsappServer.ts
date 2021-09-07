import { AnyAuthenticationCredentials, MessageType, WAConnection } from '@adiwajshing/baileys'
import fs from 'fs'
import path from 'path'
import { createStickerDocument, saveStickerUrl } from './database'
import { uploadSticker } from './storage'

const connection = new WAConnection()
connection.logger.level = 'warn'
const credentialsPath = path.resolve(__dirname, '..', 'whatsappCredentials.json')

function loadWhatsappCredentials (): AnyAuthenticationCredentials | null {
  try {
    const credentials = JSON.parse(process.env.WHATSAPP_CREDENTIALS || '')
    return credentials
  } catch {
    return null
  }
}

function saveWhatsappCredentials ():void {
  fs.writeFileSync(credentialsPath, JSON.stringify(connection.base64EncodedAuthInfo()))
}

export async function startWhatsAppServer ():Promise<WAConnection> {
  connection.on('open', saveWhatsappCredentials)
  const waCredentials = loadWhatsappCredentials()
  waCredentials && connection.loadAuthInfo(waCredentials)
  await connection.connect()

  connection.on('chat-update', async update => {
    if (
      update?.messages?.last.key.remoteJid === process.env.WHTASAPP_GROUP_ID &&
      update?.messages?.last.message?.stickerMessage &&
      update.messages.last.message.stickerMessage.url &&
      update.messages.last.status === 1

    ) {
      const buffer = await connection.downloadMediaMessage(update.messages.last)
      const id = await createStickerDocument()
      const url = await uploadSticker(buffer, id)
      await saveStickerUrl(url, id)

      connection.sendMessage(update.messages.last.key.remoteJid || '', 'Salvo', MessageType.text, {
        quoted: update.messages.last
      })
    }
  })
  return connection
}
