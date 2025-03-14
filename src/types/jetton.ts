import { Address } from '@ton/core'

export interface JettonContent {
  name?: string
  symbol?: string
  description?: string
  image?: string
  decimals?: string
  image_data?: string
  uri?: string
}

export interface JettonMetadata {
  name: string
  symbol: string
  description?: string
  decimals: number
  image?: string
}

export interface JettonInfo {
  totalSupply: bigint
  mintable: boolean
  adminAddress: Address | null
  metadata: JettonContent
}
