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

  created_at: Date
  updated_at: Date
}
