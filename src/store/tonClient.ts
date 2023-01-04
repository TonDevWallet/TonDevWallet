import { hookstate, useHookstate } from '@hookstate/core'
import { TonClient } from 'ton'

const TonConnection = hookstate<TonClient>(
  new TonClient({
    endpoint: 'https://mainnet.tonhubapi.com/jsonRPC',
  })
)

export function useTonClient() {
  return useHookstate(TonConnection)
}

export function setTonClient(newClient: TonClient) {
  TonConnection.set(newClient)
}

export { TonConnection }
