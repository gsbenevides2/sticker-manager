import 'dotenv/config'
import { startWebServer } from './server'
import { startWhatsAppServer } from './whatsappServer'

async function start () {
  console.log('Iniciado Servidor do WhatsApp')
  const wa = await startWhatsAppServer()
  console.log('Servidor do WhatsApp Iniciado')
  console.log('Iniciando Servidor Web')
  await startWebServer(wa)
  console.log('Servidor Web Iniciado')
}
start()
