import { SerializeTraceDump, TraceDump } from './serializer'

let logger: typeof console | undefined
if (typeof window !== 'undefined') {
  try {
    const logsEnabled = localStorage?.getItem('devwallet/traces/logs')
    logger = logsEnabled === 'true' ? console : undefined
  } catch (error) {
    //
  }
} else if (typeof process !== 'undefined') {
  if (process.env.DEVWALLET_LOGS === 'true') {
    logger = console
  }
}

export async function SendDumpToDevWallet(dump: TraceDump) {
  const serializedDump = SerializeTraceDump(dump)
  try {
    const ws = await GetDevWalletSocket()
    if (ws) {
      ws.send(
        JSON.stringify({
          type: 'transactions_dump',
          data: serializedDump,
        })
      )
      ws.close()
    } else {
      logger?.error('Could not connect to TON wallet')
    }
  } catch (wsError) {
    logger?.error('WebSocket connection error:', wsError)
  }
}

export async function GetDevWalletSocket(
  portStart: number = 33000,
  portsToTest: number = 10,
  timeout: number = 1000
): Promise<WebSocket | null> {
  for (let i = 0; i < portsToTest; i++) {
    const port = portStart + i
    try {
      const ws = await OpenDevWalletSocket(port, timeout)
      if (ws) return ws
    } catch (error: unknown) {
      logger?.error(
        `Failed to connect on port ${port}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
  return null
}

export async function OpenDevWalletSocket(
  port: number,
  connectionTimeout: number = 1000
): Promise<WebSocket | null> {
  // Create a new promise that will resolve when we get a valid response or reject on timeout
  return new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`)

    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error('Connection timeout'))
    }, connectionTimeout)

    ws.onopen = function () {
      // Send handshake message
      ws.send(
        JSON.stringify({
          type: 'handshake',
          id: 1,
        })
      )
    }

    ws.onmessage = function (event) {
      try {
        const response = JSON.parse(event.data)
        if (response.type === 'response' && response.name === 'tondevwallet') {
          clearTimeout(timeout)
          resolve(ws)
        } else {
          clearTimeout(timeout)
          ws.close()
          reject(new Error('Not a valid TON wallet'))
        }
      } catch (error) {
        clearTimeout(timeout)
        ws.close()
        reject(error)
      }
    }

    ws.onerror = function () {
      clearTimeout(timeout)
      ws.close()
      reject(new Error('WebSocket error'))
    }
  })
}
