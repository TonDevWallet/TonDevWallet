import { LiteClient, LiteRoundRobinEngine, LiteSingleEngine } from 'ton-lite-client'
import { hookstate, useHookstate } from '@hookstate/core'
import { tauriState } from './tauri'
import { getDatabase } from '@/db'
import { delay } from '@/utils'
import { Functions } from 'ton-lite-client/dist/schema'
import { LSConfigData, Network } from '@/types/network'
import { fetch as tFetch } from '@tauri-apps/api/http'

const LiteClientState = hookstate<{
  liteClient: LiteClient
  networks: Network[]
  selectedNetwork: Network
}>(async () => {
  const db = await getDatabase()

  let networks = await db<Network>('networks').select()
  if (networks.length === 0) {
    await db<Network>('networks').insert({
      name: 'Mainnet',
      url: 'https://ton-blockchain.github.io/global.config.json',
      item_order: 0,
      is_default: true,
      is_testnet: false,
      scanner_url: 'https://tonviewer.com/',

      created_at: new Date(),
      updated_at: new Date(),
    })
    await db<Network>('networks').insert({
      name: 'Testnet',
      url: 'https://ton-blockchain.github.io/testnet-global.config.json',
      item_order: 1,
      is_default: true,
      is_testnet: true,
      scanner_url: 'https://testnet.tonviewer.com/',

      created_at: new Date(),
      updated_at: new Date(),
    })
    networks = await db<Network>('networks').select()
  }

  let selectedNetworkId = await db<{ name: string; value: string }>('settings')
    .where('name', 'selected_network')
    .first()
  // const testnetSetting = await db<{ name: string; value: string }>('settings')
  //   .where('name', 'is_testnet')
  //   .first()

  if (!selectedNetworkId) {
    await db('settings').insert({
      name: 'selected_network',
      value: networks[0].network_id,
    })
    selectedNetworkId = {
      name: 'selected_network',
      value: networks[0].network_id.toString(),
    }
  }

  let selectedNetwork = networks.find(
    (n) => n.network_id === parseInt(selectedNetworkId?.value || '0', 10)
  )
  if (!selectedNetwork) {
    selectedNetwork = networks[0]
  }
  // const isTestnet = testnetSetting?.value === 'true'

  return {
    networks,
    selectedNetwork,
    liteClient: getLiteClient(selectedNetwork.url),
  }
})

export function useLiteclient() {
  return useHookstate(LiteClientState).liteClient.get({ noproxy: true })
}

export function useLiteclientState() {
  return useHookstate(LiteClientState)
}

export async function updateNetworksList() {
  const db = await getDatabase()
  const networks = await db<Network>('networks').select()

  const oldSelectedNetwork = LiteClientState.selectedNetwork.get()
  const selectedId = oldSelectedNetwork.network_id
  const oldNetworkUrl = oldSelectedNetwork.url

  let selectedNetwork = networks.find((n) => n.network_id === selectedId)
  if (!selectedNetwork) {
    selectedNetwork = networks[0]
  }

  LiteClientState.networks.set(networks)
  LiteClientState.selectedNetwork.set(selectedNetwork)

  if (oldNetworkUrl !== selectedNetwork.url) {
    changeLiteClient(selectedNetwork.network_id)
  }
}

export async function changeLiteClient(networkId: number) {
  const db = await getDatabase()
  const selectedNetwork = LiteClientState.networks.get().find((n) => n.network_id === networkId)
  if (!selectedNetwork) {
    return
  }
  // const selectedNetworkId = await db<{ name: string; value: string }>('settings')
  //   .where('name', 'selected_network')
  //   .first()

  const newLiteClient = getLiteClient(selectedNetwork.url)

  await db<{ name: string; value: string }>('settings')
    .where('name', 'selected_network')
    .update('value', String(networkId))

  if (LiteClientState.liteClient.get()) {
    LiteClientState.liteClient.get().engine.close()
  }
  LiteClientState.merge({
    liteClient: newLiteClient,
    selectedNetwork,
  })
  // LiteClientState.set({
  //   testnet,
  //   liteClient: newLiteClient,
  //   networks: LiteClientState.networks.get(),
  // })

  return newLiteClient
}

export function getLiteClient(configUrl: string): LiteClient {
  const engine = new LiteRoundRobinEngine([])
  const client = new LiteClient({ engine })

  addWorkingEngineToRoundRobin(configUrl, engine)

  return client
}

async function addWorkingEngineToRoundRobin(configUrl: string, robin: LiteRoundRobinEngine) {
  const { data } = await tFetch<LSConfigData>(configUrl)
  if (!data || !data.liteservers) {
    return
  }
  const shuffledEngines = shuffle(data.liteservers)

  const tauri = (await tauriState.promise) || tauriState
  if (!tauri) {
    throw new Error('no tauri')
  }

  let goodEngineFound = false
  const registerConnect = (engine: LiteSingleEngine) => {
    if (goodEngineFound) {
      engine.close()
    } else {
      robin.addSingleEngine(engine)

      const keepAlive = () => {
        if (robin.isClosed()) {
          return
        }

        robin.query(Functions.liteServer_getTime, { kind: 'liteServer.getTime' }).catch(() => {})
        setTimeout(keepAlive, 55000)
      }

      setTimeout(keepAlive, 55000)

      goodEngineFound = true
    }
  }

  for (const ls of shuffledEngines) {
    if (goodEngineFound) {
      break
    }

    const pubkey = encodeURIComponent(ls.id.key)
    const singleEngine = new LiteSingleEngine({
      host: `ws://localhost:${tauri.port.get()}/?ip=${ls.ip}&port=${ls.port}&pubkey=${pubkey}`,
      publicKey: Buffer.from(ls.id.key, 'base64'),
      client: 'ws',
    })

    setTimeout(async () => {
      try {
        const check = await checkEngine(singleEngine)
        if (!check) {
          singleEngine.close()
        } else {
          registerConnect(singleEngine)
        }
      } catch (e) {
        singleEngine.close()
      }
    }, 1)

    await delay(100)
  }
}

function shuffle<T>(array: T[]): T[] {
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

async function checkEngine(engine: LiteSingleEngine): Promise<boolean> {
  let resolve
  const promise = new Promise<boolean>((_resolve) => {
    resolve = _resolve
  })

  const doChecks = async () => {
    const client = new LiteClient({ engine })

    let rejected = false
    setTimeout(() => {
      rejected = true
      resolve(false)
    }, 1000)

    while (true) {
      if (rejected) {
        break
      }
      try {
        await client.getCurrentTime()
        resolve(true)
        break
      } catch (e) {
        await delay(16)
      }
    }
  }

  doChecks()
  return promise
}
