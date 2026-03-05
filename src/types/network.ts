/**
 * networks
 */
/** Mainnet chain ID */
export const MAINNET_CHAIN_ID = -239
/** Testnet chain ID */
export const TESTNET_CHAIN_ID = -3

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
  use_tonapi_only?: boolean
  tonapi_url?: string
  /** Chain ID for TonConnect etc. -239 mainnet, -3 testnet. Custom networks can use other values. */
  chain_id?: number | null

  created_at: Date
  updated_at: Date
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
