import { LiteClient, LiteRoundRobinEngine, LiteSingleEngine } from 'ton-lite-client'
import { hookstate, useHookstate } from '@hookstate/core'
import { tauriState } from './tauri'
import { getDatabase } from '@/db'
import { delay } from '@/utils'
import { Functions } from 'ton-lite-client/dist/schema'
import { LSConfigData, Network } from '@/types/network'
import { fetch as tFetch } from '@tauri-apps/plugin-http'
import { Api, HttpClient } from 'tonapi-sdk-js'
import { TonapiBlockchainAdapter } from './tonapiBlockchainAdapter'

const LiteClientState = hookstate<{
  liteClient: LiteClient | null
  tonapiAdapter: TonapiBlockchainAdapter | null
  networks: Network[]
  selectedNetwork: Network
  tonapiClient?: Api<unknown>
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
      toncenter3_url: 'https://toncenter.com/api/v3/',
      lite_engine_host_mode: 'auto',
      lite_engine_host_custom: '',
      use_tonapi_only: false,
      tonapi_url: '',
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
      toncenter3_url: 'https://testnet.toncenter.com/api/v3/',
      lite_engine_host_mode: 'auto',
      lite_engine_host_custom: '',
      use_tonapi_only: false,
      tonapi_url: '',
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

  const tonapiToken = await db<{ name: string; value: string }>('settings')
    .where('name', 'tonapi_token')
    .first()

  const headers: Record<string, string> = {
    'Content-type': 'application/json',
  }

  if (tonapiToken?.value) {
    headers.Authorization = `Bearer ${tonapiToken.value}`
  }

  const baseUrl =
    selectedNetwork.tonapi_url?.trim() ||
    (selectedNetwork.is_testnet ? 'https://testnet.tonapi.io' : 'https://tonapi.io')

  const httpClient = new HttpClient({
    baseUrl,
    baseApiParams: {
      headers,
    },
  })

  const tonapiClient = new Api(httpClient)

  const useTonapiOnly = !!selectedNetwork.use_tonapi_only
  let liteClient: LiteClient | null = null
  let tonapiAdapter: TonapiBlockchainAdapter | null = null

  if (useTonapiOnly) {
    tonapiAdapter = new TonapiBlockchainAdapter(tonapiClient)
  } else {
    liteClient = getLiteClient(selectedNetwork.url, selectedNetwork)
  }

  return {
    networks,
    selectedNetwork,
    liteClient,
    tonapiAdapter,
    tonapiClient,
  }
})

/** Returns the active blockchain client (LiteClient or TonapiBlockchainAdapter) */
export function useLiteclient(): LiteClient | TonapiBlockchainAdapter {
  const state = useHookstate(LiteClientState)
  const liteClient = state.liteClient.get({ noproxy: true })
  const tonapiAdapter = state.tonapiAdapter.get({ noproxy: true })

  if (liteClient) {
    return liteClient as LiteClient
  }

  if (tonapiAdapter) {
    return tonapiAdapter as TonapiBlockchainAdapter
  }

  throw new Error('No blockchain client found')
}

/** Whether the current network uses TonAPI only (no LiteClient) */
export function useTonapiOnly() {
  return !!useHookstate(LiteClientState).selectedNetwork.get({ noproxy: true }).use_tonapi_only
}

export function useTonapiClient() {
  return useHookstate(LiteClientState).tonapiClient.get({ noproxy: true })
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

  const tonapiChanged =
    !!oldSelectedNetwork.use_tonapi_only !== !!selectedNetwork.use_tonapi_only ||
    (oldSelectedNetwork.tonapi_url || '') !== (selectedNetwork.tonapi_url || '')
  if (oldNetworkUrl !== selectedNetwork.url || tonapiChanged) {
    changeLiteClient(selectedNetwork.network_id)
  }
}

export function getApiClient(): LiteClient | TonapiBlockchainAdapter {
  const liteClient =
    LiteClientState.liteClient.get({ noproxy: true }) ??
    LiteClientState.tonapiAdapter.get({ noproxy: true })

  if (!liteClient) {
    throw new Error('No blockchain client found')
  }

  return liteClient as LiteClient | TonapiBlockchainAdapter
}

export async function changeLiteClient(networkId: number) {
  const db = await getDatabase()
  const selectedNetwork = LiteClientState.networks.get().find((n) => n.network_id === networkId)
  if (!selectedNetwork) {
    return
  }

  const useTonapiOnly = !!selectedNetwork.use_tonapi_only

  await db<{ name: string; value: string }>('settings')
    .where('name', 'selected_network')
    .update('value', String(networkId))

  if (useTonapiOnly) {
    LiteClientState.selectedNetwork.set(selectedNetwork)
    await updateTonapiClient()
    const tonapiClient = LiteClientState.tonapiClient.get() as Api<unknown> | undefined
    const newAdapter = tonapiClient ? new TonapiBlockchainAdapter(tonapiClient) : null
    LiteClientState.tonapiAdapter.set(newAdapter)
    return newAdapter
  } else {
    const newLiteClient = getLiteClient(selectedNetwork.url, selectedNetwork)
    const oldLiteClient = LiteClientState.liteClient.get()
    if (oldLiteClient?.engine) {
      oldLiteClient.engine.close()
    }
    LiteClientState.merge({
      liteClient: newLiteClient,
      tonapiAdapter: null,
      selectedNetwork,
    })
    await updateTonapiClient()
    return newLiteClient
  }
}

export function getLiteClient(configUrl: string, network?: Network): LiteClient {
  const engine = new LiteRoundRobinEngine([])
  const client = new LiteClient({ engine })

  addWorkingEngineToRoundRobin(configUrl, engine, network)
  ;(client as any).configUrl = configUrl

  return client
}

async function addWorkingEngineToRoundRobin(
  configUrl: string,
  robin: LiteRoundRobinEngine,
  network?: Network
) {
  const response = await tFetch(configUrl)
  const data = (await response.json()) as LSConfigData
  if (!data || !data.liteservers) {
    return
  }
  const shuffledEngines = shuffle(data.liteservers)

  const useCustomHost =
    network?.lite_engine_host_mode === 'custom' && network?.lite_engine_host_custom
  const customHost = network?.lite_engine_host_custom

  let tauri: typeof tauriState | null = null
  if (!useCustomHost) {
    tauri = (await tauriState.promise) || tauriState
    if (!tauri) {
      throw new Error('no tauri')
    }
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
    const host = useCustomHost
      ? customHost! + `/?ip=${ls.ip}&port=${ls.port}&pubkey=${pubkey}`
      : `ws://localhost:${tauri!.port.get()}/?ip=${ls.ip}&port=${ls.port}&pubkey=${pubkey}`

    const singleEngine = new LiteSingleEngine({
      host,
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

export async function updateTonapiClient() {
  const db = await getDatabase()
  const tonapiToken = await db<{ name: string; value: string }>('settings')
    .where('name', 'tonapi_token')
    .first()

  const selectedNetwork = LiteClientState.selectedNetwork.get()

  const headers: Record<string, string> = {
    'Content-type': 'application/json',
  }

  if (tonapiToken?.value) {
    headers.Authorization = `Bearer ${tonapiToken.value}`
  }

  const baseUrl =
    selectedNetwork.tonapi_url?.trim() ||
    (selectedNetwork.is_testnet ? 'https://testnet.tonapi.io' : 'https://tonapi.io')

  const httpClient = new HttpClient({
    baseUrl,
    baseApiParams: {
      headers,
    },
  })

  const tonapiClient = new Api(httpClient)

  LiteClientState.tonapiClient.set(tonapiClient)
}
