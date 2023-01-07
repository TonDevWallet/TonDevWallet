import { Address, Cell } from 'ton-core'

export interface HighloadWalletInitData {
  subwalletId: number // uint 32
  publicKey: Buffer // bytes
  workchain: number
}

export interface WalletTransfer {
  destination: Address
  amount: bigint
  mode: number

  body?: Cell
  state?: Cell
  bounce?: boolean
}
