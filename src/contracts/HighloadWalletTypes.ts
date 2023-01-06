import BN from 'bn.js'
import { Address, Cell } from 'ton'

export interface HighloadWalletInitData {
  subwalletId: number // uint 32
  publicKey: Buffer // bytes
  workchain: number
}

export interface WalletTransfer {
  destination: Address
  amount: BN
  mode: number

  body?: Cell
  state?: Cell
  bounce?: boolean
}
