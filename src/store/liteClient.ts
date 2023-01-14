import { LiteClient, LiteRoundRobinEngine, LiteSingleEngine } from 'ton-lite-client'
import networkConfig from '@/networkConfig'
import { hookstate, useHookstate } from '@hookstate/core'
import { tauriState } from './tauri'

const LiteClientState = hookstate<{
  liteClient: LiteClient
  testnet: boolean
}>({
  testnet: false,
  liteClient: getLiteClient(false),
})

export function useLiteclient() {
  return useHookstate(LiteClientState).liteClient.get({ noproxy: true })
}

export function changeLiteClient(testnet: boolean) {
  console.log('changeLiteClient', testnet)
  const newLiteClient = getLiteClient(testnet)
  LiteClientState.set({
    testnet,
    liteClient: newLiteClient,
  })
}

function getTempClient() {
  interface queueItem {
    method: string
    args: unknown[]
    resolve: () => void
    reject: () => void
  }

  const queue: queueItem[] = []
  let localClient: LiteClient | undefined

  const createShim = (name: string) => {
    return (...args: unknown[]) => {
      if (localClient) {
        return localClient[name](...args)
      }

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      let _resolve: () => void = () => {}
      // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-explicit-any
      let _reject: (reason?: any) => void = () => {}

      const p = new Promise<void>((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })

      queue.push({
        method: name,
        args: [...args],
        resolve: _resolve,
        reject: _reject,
      })

      return p
    }
  }
  const tempWait = {}
  for (const name of [
    'getMasterchainInfo',
    'getAccountState',
    'getAccountTransactions',
    'sendMessage',
    'getMasterchainInfoExt',
    'getCurrentTime',
    'getVersion',
    'getConfig',
    'getAccountTransaction',
    'runMethod',
    'lookupBlockByID',
    'getBlockHeader',
    'getAllShardsInfo',
    'listBlockTransactions',
    'getFullBlock',
  ]) {
    tempWait[name] = createShim(name)
  }

  const endWait = (client: LiteClient) => {
    localClient = client
    for (const item of queue) {
      // console.log('item work', item, lc)
      if (client && client[item.method]) {
        client[item.method](...item.args)
          .then(item.resolve)
          .catch(item.reject)
      }
    }
  }

  return {
    tmpClient: tempWait as LiteClient,
    endWait,
  }
}

function getLiteClient(isTestnet: boolean): LiteClient {
  const { tmpClient, endWait } = getTempClient()
  console.log('getLiteClient', isTestnet)
  setTimeout(async () => {
    const data = isTestnet ? networkConfig.testnetConfig : networkConfig.mainnetConfig

    const tauri = (await tauriState.promise) || tauriState
    if (!tauri) {
      console.log('no tauri', tauri)
      return
    }

    const engines: LiteSingleEngine[] = []
    for (const ls of data.liteservers.slice(1, 2)) {
      const pubkey = encodeURIComponent(ls.id.key)
      engines.push(
        new LiteSingleEngine({
          // host: `wss://ws.tonlens.com/?ip=${ls.ip}&port=${ls.port}&pubkey=${pubkey}`,
          host: `ws://localhost:${tauri.port.get()}/?ip=${ls.ip}&port=${ls.port}&pubkey=${pubkey}`,
          publicKey: Buffer.from(ls.id.key, 'base64'),
          client: 'ws',
        })
      )
    }

    const engine = new LiteRoundRobinEngine(engines)
    const client = new LiteClient({ engine })

    await client.getMasterchainInfo()
    endWait(client)
  }, 0)
  return tmpClient
}

export { LiteClientState }
