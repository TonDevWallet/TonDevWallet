/**
 * networks
 */
export interface Network {
  network_id: number
  name: string
  url: string
  item_order: number
  is_default: boolean
  is_testnet: boolean
  scanner_url?: string
  toncenter3_url?: string

  created_at: Date
  updated_at: Date
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
