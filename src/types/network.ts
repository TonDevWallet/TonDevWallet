/**
 * networks
 */
/** Mainnet chain ID */
export const MAINNET_CHAIN_ID = -239
/** Testnet chain ID */
export const TESTNET_CHAIN_ID = -3

/** Primary chain data source (LiteClient vs HTTP APIs). */
export const BLOCKCHAIN_SOURCES = ['liteclient', 'tonapi', 'toncenter'] as const
export type BlockchainSource = (typeof BLOCKCHAIN_SOURCES)[number]

export interface Network {
  network_id: number
  name: string
  url: string
  item_order: number
  is_default: boolean
  is_testnet: boolean
  scanner_url?: string
  toncenter3_url?: string
  lite_engine_host_mode?: 'auto' | 'custom'
  lite_engine_host_custom?: string
  blockchain_source?: BlockchainSource
  tonapi_url?: string
  /** TonAPI bearer token for this network (Authorization header). */
  tonapi_token?: string | null
  /** TonCenter HTTP API v3 key for this network (X-Api-Key). */
  toncenter_token?: string | null
  /** Chain ID for TonConnect etc. -239 mainnet, -3 testnet. Custom networks can use other values. */
  chain_id?: number | null

  created_at: Date
  updated_at: Date
}

export function normalizeBlockchainSource(raw: string | null | undefined): BlockchainSource {
  if (raw === 'liteclient' || raw === 'tonapi' || raw === 'toncenter') {
    return raw
  }
  return 'liteclient'
}

/** True when the app uses liteservers (Tauri WS proxy) for the primary client. */
export function isLiteClientBlockchainSource(source: BlockchainSource): boolean {
  return source === 'liteclient'
}

/** Resolved primary source for a network row (invalid/missing values default to liteclient). */
export function getNetworkBlockchainSource(
  network: Pick<Network, 'blockchain_source'>
): BlockchainSource {
  return normalizeBlockchainSource(network.blockchain_source)
}

/** Returns chain ID for TonConnect, address book, etc. Uses chain_id when set, else default by is_testnet. */
export function getNetworkChainId(network: Network): number {
  if (network.chain_id != null && !Number.isNaN(network.chain_id)) {
    return network.chain_id
  }
  return network.is_testnet ? TESTNET_CHAIN_ID : MAINNET_CHAIN_ID
}

export interface LSConfigData {
  '@type': string
  dht: {
    '@type': string
    k: number
    a: number
    static_nodes: {
      '@type': string
      nodes: string[]
    }
  }
  liteservers: {
    id: { key: string; '@type': string }
    port: number
    ip: number
  }[]
  validator: {
    '@type': string
    zero_state: {
      workchain: number
      shard: number
      seqno: number
      root_hash: string
      file_hash: string
    }
    init_block: {
      workchain: number
      shard: number
      seqno: number
      root_hash: string
      file_hash: string
    }
  }
}

export interface ExtraCurrencyMeta {
  symbol: string
  decimals: number
}

export type ExtraCurrencyConfig = {
  [networkId: number]: {
    [extraCurrencyId: string]: ExtraCurrencyMeta
  }
}

export interface AddressEntry {
  address: string
  title: string
  description: string
  createdAt: number // timestamp
}

export type AddressBookConfig = {
  [networkId: number]: {
    [addressId: string]: AddressEntry
  }
}
