import { LiteClient, LiteRoundRobinEngine, LiteSingleEngine } from 'ton-lite-client'
import networkConfig from '@/networkConfig'
import { hookstate, useHookstate } from '@hookstate/core'
import { tauriState } from './tauri'

const LiteClientState = hookstate<{
  liteClient: LiteClient
  testnet: boolean
}>(async () => {
  return {
    testnet: false,
    liteClient: await getLiteClientAsync(false),
  }
})

export function useLiteclient() {
  return useHookstate(LiteClientState).liteClient.get({ noproxy: true })
}

export function useLiteclientState() {
  return useHookstate(LiteClientState)
}

export async function changeLiteClient(testnet: boolean) {
  console.log('changeLiteClient', testnet)
  const newLiteClient = await getLiteClientAsync(testnet)

  if (LiteClientState.liteClient.get()) {
    LiteClientState.liteClient.get().engine.close()
  }
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
  let clientResolved = false

  const createShim = (name: string) => {
    return (...args: unknown[]) => {
      if (clientResolved && localClient) {
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
    // 'engine',
  ]) {
    tempWait[name] = createShim(name)
  }

  localClient = tempWait as LiteClient

  const endWait = (client: LiteClient) => {
    localClient = client
    clientResolved = true

    LiteClientState.merge({
      liteClient: localClient,
    })
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
    tmpClient: localClient as LiteClient,
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
    for (const ls of shuffle(data.liteservers).slice(0, 3)) {
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

export async function getLiteClientAsync(isTestnet: boolean): Promise<LiteClient> {
  const data = isTestnet ? networkConfig.testnetConfig : networkConfig.mainnetConfig

  const tauri = (await tauriState.promise) || tauriState
  if (!tauri) {
    console.log('no tauri', tauri)
    throw new Error('no tauri')
    // return
  }

  const engines: LiteSingleEngine[] = []
  for (const ls of shuffle(data.liteservers).slice(0, 3)) {
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
  return client
}

function shuffle(array) {
  let currentIndex = array.length
  let randomIndex

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    ;[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
  }

  return array
}

export { LiteClientState }
