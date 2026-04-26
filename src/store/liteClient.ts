import { LiteClient, LiteRoundRobinEngine, LiteSingleEngine } from 'ton-lite-client'
import { hookstate, useHookstate } from '@hookstate/core'
import { tauriState } from './tauri'
import { getDatabase } from '@/db'
import { delay } from '@/utils'
import { Functions } from 'ton-lite-client/dist/schema'
import {
  LSConfigData,
  Network,
  BlockchainSource,
  getNetworkBlockchainSource,
  isLiteClientBlockchainSource,
} from '@/types/network'
import { fetch as tFetch } from '@tauri-apps/plugin-http'
import { Api, HttpClient } from 'tonapi-sdk-js'
import { TonapiBlockchainAdapter } from './tonapiBlockchainAdapter'
import { ToncenterBlockchainAdapter } from './toncenterBlockchainAdapter'
import type { ApiClient } from './primaryChainClient'
import { LiteClientPrimaryAdapter } from './liteClientPrimaryAdapter'

export type {
  BlockRef,
  AccountState,
  ApiClient,
  LibraryClient,
  ShardQuery,
  ShardsResponse,
} from './primaryChainClient'

export { LiteClientPrimaryAdapter } from './liteClientPrimaryAdapter'

const litePrimaryAdapterCache = new WeakMap<LiteClient, LiteClientPrimaryAdapter>()

function wrapLiteClientAsPrimary(lc: LiteClient): ApiClient {
  let w = litePrimaryAdapterCache.get(lc)
  if (!w) {
    w = new LiteClientPrimaryAdapter(lc)
    litePrimaryAdapterCache.set(lc, w)
  }
  return w
}

function toncenterBaseUrl(network: Network): string {
  const t = network.toncenter3_url?.trim()
  if (t) {
    return t.endsWith('/') ? t : `${t}/`
  }
  return network.is_testnet
    ? 'https://testnet.toncenter.com/api/v3/'
    : 'https://toncenter.com/api/v3/'
}

const LiteClientState = hookstate<{
  liteClient: LiteClient | null
  tonapiAdapter: TonapiBlockchainAdapter | null
  toncenterAdapter: ToncenterBlockchainAdapter | null
  networks: Network[]
  selectedNetwork: Network
  tonapiClient?: Api<unknown>
}>(async () => {
  const db = await getDatabase()

  let networks = await db.select<Network>('SELECT * FROM networks ORDER BY item_order ASC')
  if (networks.length === 0) {
    await db.execute(
      `
        INSERT INTO networks (
          name,
          url,
          item_order,
          is_default,
          is_testnet,
          scanner_url,
          toncenter3_url,
          lite_engine_host_mode,
          lite_engine_host_custom,
          blockchain_source,
          tonapi_url,
          tonapi_token,
          toncenter_token,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        'Mainnet',
        'https://ton-blockchain.github.io/global.config.json',
        0,
        true,
        false,
        'https://tonviewer.com/',
        'https://toncenter.com/api/v3/',
        'auto',
        '',
        'liteclient',
        '',
        '',
        '',
        new Date(),
        new Date(),
      ]
    )
    await db.execute(
      `
        INSERT INTO networks (
          name,
          url,
          item_order,
          is_default,
          is_testnet,
          scanner_url,
          toncenter3_url,
          lite_engine_host_mode,
          lite_engine_host_custom,
          blockchain_source,
          tonapi_url,
          tonapi_token,
          toncenter_token,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        'Testnet',
        'https://ton-blockchain.github.io/testnet-global.config.json',
        1,
        true,
        true,
        'https://testnet.tonviewer.com/',
        'https://testnet.toncenter.com/api/v3/',
        'auto',
        '',
        'liteclient',
        '',
        '',
        '',
        new Date(),
        new Date(),
      ]
    )
    networks = await db.select<Network>('SELECT * FROM networks ORDER BY item_order ASC')
  }

  let selectedNetworkId = await db.first<{ name: string; value: string }>(
    'SELECT * FROM settings WHERE name = ?',
    ['selected_network']
  )

  if (!selectedNetworkId) {
    await db.execute('INSERT INTO settings (name, value) VALUES (?, ?)', [
      'selected_network',
      String(networks[0].network_id),
    ])
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

  const headers: Record<string, string> = {
    'Content-type': 'application/json',
  }

  const tonapiBearer = selectedNetwork.tonapi_token?.trim()
  if (tonapiBearer) {
    headers.Authorization = `Bearer ${tonapiBearer}`
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

  const { liteClient, tonapiAdapter, toncenterAdapter } = buildPrimaryClients(
    selectedNetwork,
    tonapiClient
  )

  return {
    networks,
    selectedNetwork,
    liteClient,
    tonapiAdapter,
    toncenterAdapter,
    tonapiClient,
  }
})

function buildPrimaryClients(selectedNetwork: Network, tonapiClient: Api<unknown>) {
  const toncenterKey = selectedNetwork.toncenter_token?.trim()
  const source = getNetworkBlockchainSource(selectedNetwork)
  if (source === 'liteclient') {
    return {
      liteClient: getLiteClient(selectedNetwork.url, selectedNetwork),
      tonapiAdapter: null as TonapiBlockchainAdapter | null,
      toncenterAdapter: null as ToncenterBlockchainAdapter | null,
    }
  }
  if (source === 'tonapi') {
    return {
      liteClient: null,
      tonapiAdapter: new TonapiBlockchainAdapter(tonapiClient),
      toncenterAdapter: null,
    }
  }
  return {
    liteClient: null,
    tonapiAdapter: null,
    toncenterAdapter: new ToncenterBlockchainAdapter(
      toncenterBaseUrl(selectedNetwork),
      toncenterKey || undefined
    ),
  }
}

/** Active primary chain client (liteserver, TonAPI, or TonCenter). */
export function useLiteclient(): ApiClient {
  return useApiClient()
}

/** Same as useLiteclient — use when emphasizing HTTP vs liteserver. */
export function useApiClient(): ApiClient {
  const state = useHookstate(LiteClientState)
  const liteClient = state.liteClient.get({ noproxy: true })
  const tonapiAdapter = state.tonapiAdapter.get({ noproxy: true })
  const toncenterAdapter = state.toncenterAdapter.get({ noproxy: true })
  const rawLite = liteClient as LiteClient | null
  const c = rawLite
    ? wrapLiteClientAsPrimary(rawLite)
    : ((tonapiAdapter ?? toncenterAdapter) as ApiClient | null)
  if (!c) {
    throw new Error('No blockchain client found')
  }
  return c
}

/** Throws unless the current network uses LiteClient (liteservers). */
export function useLiteClientRequired(): LiteClient {
  const raw = useHookstate(LiteClientState).liteClient.get({ noproxy: true }) as LiteClient | null
  if (!raw) {
    throw new Error('This action requires LiteClient (liteserver) network mode')
  }
  return raw
}

export function getApiClient(): ApiClient {
  const rawLite = LiteClientState.liteClient.get({ noproxy: true }) as LiteClient | null
  if (rawLite) {
    return wrapLiteClientAsPrimary(rawLite)
  }
  const c = (LiteClientState.tonapiAdapter.get({ noproxy: true }) ??
    LiteClientState.toncenterAdapter.get({ noproxy: true })) as ApiClient | null

  if (!c) {
    throw new Error('No blockchain client found')
  }

  return c
}

/** Current network primary source. */
export function useBlockchainSource(): BlockchainSource {
  const n = useHookstate(LiteClientState).selectedNetwork.get({ noproxy: true })
  return getNetworkBlockchainSource(n)
}

/** True when using liteservers for the primary client. */
export function useIsLiteClientMode(): boolean {
  return isLiteClientBlockchainSource(useBlockchainSource())
}

/** True only when primary client is TonAPI (not TonCenter, not LiteClient). */
export function useTonapiOnly(): boolean {
  return useBlockchainSource() === 'tonapi'
}

export function useTonapiClient() {
  return useHookstate(LiteClientState).tonapiClient.get({ noproxy: true })
}

export function useLiteclientState() {
  return useHookstate(LiteClientState)
}

export async function updateNetworksList() {
  const db = await getDatabase()
  const networks = await db.select<Network>('SELECT * FROM networks ORDER BY item_order ASC')

  const oldSelectedNetwork = LiteClientState.selectedNetwork.get()
  const selectedId = oldSelectedNetwork.network_id
  const oldNetworkUrl = oldSelectedNetwork.url

  let selectedNetwork = networks.find((n) => n.network_id === selectedId)
  if (!selectedNetwork) {
    selectedNetwork = networks[0]
  }

  LiteClientState.networks.set(networks)
  LiteClientState.selectedNetwork.set(selectedNetwork)

  const oldSrc = getNetworkBlockchainSource(oldSelectedNetwork)
  const newSrc = getNetworkBlockchainSource(selectedNetwork)
  const sourceOrEndpointsChanged =
    oldSrc !== newSrc ||
    (oldSelectedNetwork.tonapi_url || '') !== (selectedNetwork.tonapi_url || '') ||
    (oldSelectedNetwork.toncenter3_url || '') !== (selectedNetwork.toncenter3_url || '')

  const tokensChanged =
    (oldSelectedNetwork.tonapi_token || '') !== (selectedNetwork.tonapi_token || '') ||
    (oldSelectedNetwork.toncenter_token || '') !== (selectedNetwork.toncenter_token || '')

  const needsLiteClientRebuild = oldNetworkUrl !== selectedNetwork.url || sourceOrEndpointsChanged

  if (needsLiteClientRebuild) {
    await changeLiteClient(selectedNetwork.network_id)
  } else if (tokensChanged) {
    await refreshBlockchainHttpClients()
    const tonapiClient = LiteClientState.tonapiClient.get() as Api<unknown> | undefined
    const src = getNetworkBlockchainSource(selectedNetwork)
    if (src === 'tonapi') {
      LiteClientState.tonapiAdapter.set(new TonapiBlockchainAdapter(tonapiClient as Api<unknown>))
    } else if (src === 'toncenter') {
      LiteClientState.toncenterAdapter.set(
        new ToncenterBlockchainAdapter(
          toncenterBaseUrl(selectedNetwork),
          selectedNetwork.toncenter_token?.trim() || undefined
        )
      )
    }
  }
}

export async function changeLiteClient(networkId: number) {
  const db = await getDatabase()
  const selectedNetwork = LiteClientState.networks.get().find((n) => n.network_id === networkId)
  if (!selectedNetwork) {
    return
  }

  await db.execute('UPDATE settings SET value = ? WHERE name = ?', [
    String(networkId),
    'selected_network',
  ])

  const oldLiteClient = LiteClientState.liteClient.get()
  if (oldLiteClient?.engine) {
    oldLiteClient.engine.close()
  }

  LiteClientState.selectedNetwork.set(selectedNetwork)
  await refreshBlockchainHttpClients()
  const tonapiClient = LiteClientState.tonapiClient.get() as Api<unknown> | undefined
  const { liteClient, tonapiAdapter, toncenterAdapter } = buildPrimaryClients(
    selectedNetwork,
    tonapiClient as Api<unknown>
  )

  LiteClientState.merge({
    liteClient,
    tonapiAdapter,
    toncenterAdapter,
    selectedNetwork,
  })

  return liteClient ?? tonapiAdapter ?? toncenterAdapter
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

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--
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

/** Reloads TonAPI HTTP client from the current network row (URL + TonAPI bearer token). */
export async function refreshBlockchainHttpClients() {
  const selectedNetwork = LiteClientState.selectedNetwork.get()

  const headers: Record<string, string> = {
    'Content-type': 'application/json',
  }

  const tonapiBearer = selectedNetwork.tonapi_token?.trim()
  if (tonapiBearer) {
    headers.Authorization = `Bearer ${tonapiBearer}`
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

  if (getNetworkBlockchainSource(selectedNetwork) === 'toncenter') {
    LiteClientState.toncenterAdapter.set(
      new ToncenterBlockchainAdapter(
        toncenterBaseUrl(selectedNetwork),
        selectedNetwork.toncenter_token?.trim() || undefined
      )
    )
  }
}

/** @deprecated Use {@link refreshBlockchainHttpClients} */
export async function updateTonapiClient() {
  await refreshBlockchainHttpClients()
}

/** Normalize blockchain_source for DB writes from form/network row. */
export function getNetworkSourceDbFields(network: Pick<Network, 'blockchain_source'>) {
  return {
    blockchain_source: getNetworkBlockchainSource(network),
  }
}
