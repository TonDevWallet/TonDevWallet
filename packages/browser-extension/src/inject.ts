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

/**
 * Converts a hex string to a Uint8Array
 * @param hexString - The hex string to convert (with or without '0x' prefix)
 * @returns The resulting Uint8Array
 */
function hexToUint8Array(hexString: string): Uint8Array {
  // Remove 0x prefix if present
  const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  
  // Ensure even length
  const normalizedHex = hex.length % 2 ? '0' + hex : hex;
  
  const result = new Uint8Array(normalizedHex.length / 2);
  
  for (let i = 0; i < normalizedHex.length; i += 2) {
    result[i / 2] = parseInt(normalizedHex.substring(i, i + 2), 16);
  }
  
  return result;
}

/**
 * Converts a base64 string to a Uint8Array
 * @param base64String - The base64 string to convert
 * @returns The resulting Uint8Array
 */
function base64ToUint8Array(base64String: string): Uint8Array {
  // In browser environments
  if (typeof atob === 'function') {
    const binaryString = atob(base64String);
    const result = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      result[i] = binaryString.charCodeAt(i);
    }
    return result;
  } 
  // In Node.js environment
  else if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64String, 'base64'));
  }
  
  throw new Error('Unable to decode base64 string - neither atob nor Buffer is available');
}

function uint8ArrayToHex(uint8Array: Uint8Array) {
  return Array.from(uint8Array)
    .map((i) => i.toString(16).padStart(2, '0'))
    .join('');
}

// Send the decrypted data to WebSocket server
async function sendDataToDevWallet(data: string) {
  const { GetDevWalletSocket } = await import('@tondevwallet/traces/dist/socket')

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

    function secretKeyToX25519(secretKey: Uint8Array): KeyPair {
      const publicKey = x25519.getPublicKey(secretKey)
    
      return {
        secretKey: secretKey,
        publicKey: publicKey,
      }
    }
    
    const url = resource instanceof Request ? resource.url : resource
    if (options.method && options.method.toLowerCase() === 'post') {
      if (options.body) {
      }

      if (url.pathname.includes('/message')) {
        try {
            const base64Data = options.body
            const decodedData = base64ToUint8Array(base64Data)

            const localData = JSON.parse(localStorage.getItem('ton-connect-storage_bridge-connection')) as {
                session: {
                    sessionKeyPair: {
                        publicKey: string
                        secretKey: string
                    }
                    walletPublicKey: string
                }
            }

            const sessionPublicKey = hexToUint8Array(localData.session.sessionKeyPair.publicKey)
            const sessionSecretKey = hexToUint8Array(localData.session.sessionKeyPair.secretKey)
            const walletPublicKey = hexToUint8Array(localData.session.walletPublicKey)


            const keyPair = secretKeyToX25519(sessionSecretKey)
            const session = new SessionCrypto({
                publicKey: uint8ArrayToHex(keyPair.publicKey),
                secretKey: uint8ArrayToHex(keyPair.secretKey),
            })

            const decryptedData = session.decrypt(decodedData, walletPublicKey)

            const jsonData = JSON.parse(decryptedData)
            await sendDataToDevWallet(JSON.stringify({
              type: 'proxy_transaction',
              data: {
                payload: jsonData,
                publicKey: localData.session.walletPublicKey,
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