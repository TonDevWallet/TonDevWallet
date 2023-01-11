// import { Address } from 'tonweb/dist/types/utils/address'
import { HighloadWalletV2 } from '@/contracts/highload-wallet-v2/HighloadWalletV2'
import { WalletTransfer } from '@/contracts/utils/HighloadWalletTypes'
import {
  Address,
  MessageRelaxed,
  SendMode,
  WalletContractV4,
  WalletContractV3R2,
  ContractProvider,
  Cell,
} from 'ton'
import { Maybe } from 'ton-core/dist/utils/maybe'
import { KeyPair } from 'ton-crypto'

export type OpenedContract<T> = {
  [P in keyof T]: P extends `get${string}` | `send${string}`
    ? T[P] extends (x: ContractProvider, ...args: infer P_1) => infer R
      ? (...args: P_1) => R
      : never
    : T[P]
}

export type WalletType = 'v3R2' | 'v4R2' | 'highload'

export type GetExternalMessageCell = (
  keyPair: KeyPair,
  transfers: WalletTransfer[]
) => Promise<Cell>

export interface ITonWalletV3 {
  type: 'v3R2'
  address: Address
  wallet: OpenedContract<WalletContractV3R2>
  getExternalMessageCell: GetExternalMessageCell
  key: KeyPair
  id: number
  subwalletId: number
}

export interface ITonWalletV4 {
  type: 'v4R2'
  address: Address
  wallet: OpenedContract<WalletContractV4>
  getExternalMessageCell: GetExternalMessageCell
  key: KeyPair
  id: number
  subwalletId: number
}

export interface ITonHighloadWalletV2 {
  type: 'highload'
  address: Address
  wallet: HighloadWalletV2
  getExternalMessageCell: GetExternalMessageCell
  key: KeyPair
  id: number
  subwalletId: number
}

export interface ITonExternalWallet {
  type: 'external'
  id: string
}

export type ITonWallet = ITonWalletV3 | ITonWalletV4

export type IWallet = ITonWallet | ITonHighloadWalletV2 // | ITonExternalWallet

export type TonWalletTransferArg = {
  seqno: number
  secretKey: Buffer
  messages: MessageRelaxed[]
  sendMode?: Maybe<SendMode>
  timeout?: Maybe<number>
}

export interface SavedWallet {
  id: number
  type: WalletType
  key_id: number
  subwallet_id: number
}
