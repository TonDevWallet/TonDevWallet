import { Base64, hexToByteArray, SessionCrypto, WalletMessage } from '@tonconnect/protocol'
import nacl from 'tweetnacl'

const bridgeUrl = 'https://bridge.tonapi.io/bridge'

export async function sendTonConnectMessage(
  msg: WalletMessage,
  secretKey: Buffer | Uint8Array,
  clientPublicKey: string
) {
  const sessionKeypair = nacl.box.keyPair.fromSecretKey(secretKey)

  const url = new URL(`${bridgeUrl}/message`)
  url.searchParams.append('client_id', Buffer.from(sessionKeypair.publicKey).toString('hex'))
  url.searchParams.append('to', clientPublicKey)
  url.searchParams.append('ttl', '300')

  const sessionCrypto = new SessionCrypto({
    publicKey: Buffer.from(sessionKeypair.publicKey).toString('hex'),
    secretKey: Buffer.from(sessionKeypair.secretKey).toString('hex'),
  })

  const message = sessionCrypto.encrypt(JSON.stringify(msg), hexToByteArray(clientPublicKey))
  await fetch(url, {
    method: 'post',
    body: Base64.encode(message),
  })
}
