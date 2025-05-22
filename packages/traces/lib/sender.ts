import { logger } from './logger'
import { SerializeTraceDump, TraceDump } from './serializer'
import { GetDevWalletSocket } from './socket'

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
