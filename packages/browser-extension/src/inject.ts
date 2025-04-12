/* eslint-disable */
// @ts-nocheck

let logger: typeof console | undefined
if (typeof window !== 'undefined') {
  try {
    const logsEnabled = localStorage?.getItem('devwallet/extension/logs')
    logger = logsEnabled === 'true' ? console : undefined
  } catch (error) {
    //
  }
} else if (typeof process !== 'undefined') {
  if (process.env.DEVWALLET_LOGS === 'true') {
    logger = console
  }
}

;(function (originalFetch) {
  if (originalFetch?.__TONDEV_INTERCEPTED__) return

  window.fetch = async function (resource, options = {}) {
    interceptFetch(resource, options).catch(logger?.error)

    const response = originalFetch.apply(this, arguments)
    return response
  }
  window.fetch.__TONDEV_INTERCEPTED__ = true
})(window.fetch)

async function interceptFetch(resource, options) {
  try {
    const {SessionCrypto} = await import('@tonconnect/protocol')
    const {ed25519, x25519} = await import('@noble/curves/ed25519')
    const {GetDevWalletSocket} = await import('@tondevwallet/traces')

    function secretKeyToX25519(secretKey: Buffer | Uint8Array): KeyPair {
      const publicKey = x25519.getPublicKey(secretKey)
    
      return {
        secretKey: Buffer.from(secretKey),
        publicKey: Buffer.from(publicKey),
      }
    }
    
    const url = resource instanceof Request ? resource.url : resource
    if (options.method && options.method.toLowerCase() === 'post') {
      if (options.body) {
      }

      if (url.pathname.includes('/message')) {
        try {
            const base64Data = options.body
            const decodedData = Buffer.from(base64Data, 'base64')

            const localData = JSON.parse(localStorage.getItem('ton-connect-storage_bridge-connection')) as {
                session: {
                    sessionKeyPair: {
                        publicKey: string
                        secretKey: string
                    }
                    walletPublicKey: string
                }
            }

            const sessionPublicKey = Buffer.from(localData.session.sessionKeyPair.publicKey, 'hex')
            const sessionSecretKey = Buffer.from(localData.session.sessionKeyPair.secretKey, 'hex')
            const walletPublicKey = Buffer.from(localData.session.walletPublicKey, 'hex')


            const keyPair = secretKeyToX25519(sessionSecretKey)
            const session = new SessionCrypto({
                publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
                secretKey: Buffer.from(keyPair.secretKey).toString('hex'),
            })

            const decryptedData = session.decrypt(decodedData, walletPublicKey)

            const jsonData = JSON.parse(decryptedData)

            // Send the decrypted data to WebSocket server
            try {
              const websocket = await GetDevWalletSocket()
              if (websocket) {
                websocket.send(JSON.stringify({
                  type: 'proxy_transaction',
                  data: jsonData
                }))
                websocket.close()
              }
              else {
                logger?.error('Could not connect to TON wallet')
              }
            } catch (wsError) {
              logger?.error('WebSocket connection error:', wsError)
            }
            
        } catch (error) {
            logger?.error('Error decrypting data:', error)
        }
      }
    }
  } catch (e) {
    logger?.error('Error importing modules:', e)
  }
}