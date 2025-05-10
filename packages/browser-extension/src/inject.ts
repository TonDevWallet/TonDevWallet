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

async function sendDataToDevWallet(data: string) {
  // Send the decrypted data to WebSocket server
  const {GetDevWalletSocket} = await import('@tondevwallet/traces')

  try {
    const websocket = await GetDevWalletSocket()
    if (websocket) {
      websocket.send(data)
      websocket.close()
    }
    else {
      logger?.error('Could not connect to TON wallet')
    }
  } catch (wsError) {
    logger?.error('WebSocket connection error:', wsError)
  }
}

// Initialize DOM node observer
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'svg') {
            logger?.log('SVG node detected:', node)
            if (node.childNodes.length > 10) {
              return
            }

            if (node.clientHeight < 100 || node.clientWidth < 100) {
              return
            }

            if (node.clientHeight !== node.clientWidth) {
              return
            }

            const svgElement = node;
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const DOMURL = window.URL || window.webkitURL || window;
            const svgUrl = DOMURL.createObjectURL(svgBlob);
            
            const canvas = document.createElement('canvas');
            canvas.width = svgElement.clientWidth;
            canvas.height = svgElement.clientHeight;
            const ctx = canvas.getContext('2d');
            
            const img = new Image();
            img.onload = async () => {
              ctx.drawImage(img, 0, 0);
              const pngData = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
              DOMURL.revokeObjectURL(svgUrl);
              
              try {
                await sendDataToDevWallet(JSON.stringify({
                  type: 'tonconnect_svg',
                  data: {
                    image: pngData,
                  }
                }));
              } catch (error) {
                logger?.error('Error processing SVG data:', error);
              }
            };
            img.src = svgUrl;
          }
        });
      }
    });
  });

  // Start observing the document with the configured parameters
  observer.observe(document, { childList: true, subtree: true });
}

;(function (originalFetch) {
  if (originalFetch?.__TONDEV_INTERCEPTED__) return

  window.fetch = async function (resource, options = {}) {
    const response = originalFetch.apply(this, arguments)
    interceptFetch(resource, options).catch(logger?.error)
    return response
  }
  window.fetch.__TONDEV_INTERCEPTED__ = true
})(window.fetch)


async function interceptFetch(resource, options) {
  try {
    const {SessionCrypto} = await import('@tonconnect/protocol')
    const {ed25519, x25519} = await import('@noble/curves/ed25519')

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
            await sendDataToDevWallet(JSON.stringify({
              type: 'proxy_transaction',
              data: {
                payload: jsonData,
                publicKey: walletPublicKey.toString('hex'),
              }
            }))
        } catch (error) {
            logger?.error('Error decrypting data:', error)
        }
      }
    }
  } catch (e) {
    logger?.error('Error importing modules:', e)
  }
}