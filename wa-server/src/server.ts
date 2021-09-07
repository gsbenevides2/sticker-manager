import { MessageType, WAConnection } from '@adiwajshing/baileys'
import express from 'express'
import cors from 'cors'
const app = express()

app.use(cors({ origin: process.env.CORS || '' }))

export async function startWebServer (waConnection:WAConnection) {
  app.get('/sendSticker', async (req, res) => {
    const url = req.query.url as string
    await waConnection.sendMessage(process.env.WHTASAPP_GROUP_ID || '', { url }, MessageType.sticker)
    res.send('OK')
  })
  app.get('/reconnect', async (_req, res) => {
    waConnection.close()
    await waConnection.connect()
    res.send('OK')
  })
  return new Promise<void>(resolve => {
    app.listen(process.env.PORT, () => { resolve() })
  })
}
