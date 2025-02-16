import {
  HighloadWalletV2,
  HighloadWalletV2R2,
} from '@/contracts/highload-wallet-v2/HighloadWalletV2'
import { WalletTransfer } from '@/contracts/utils/HighloadWalletTypes'
import { EncryptedWalletData } from '@/store/passwordManager'
import type { Address, MessageRelaxed, SendMode, ContractProvider, Cell } from '@ton/core'
import {
  WalletContractV4,
  WalletContractV3R2,
  WalletContractV3R1,
  WalletContractV2R1,
  WalletContractV2R2,
  WalletContractV1R3,
  WalletContractV1R2,
  WalletContractV1R1,
} from '@ton/ton'
import { KeyPair } from '@ton/crypto'
import { HighloadWalletV3 } from '@/contracts/highload-wallet-v3/HighloadWalletV3'
import { WalletV5 } from '@/contracts/w5/WalletV5R1'

export type OpenedContract<T> = {
  [P in keyof T]: P extends `get${string}` | `send${string}`
    ? T[P] extends (x: ContractProvider, ...args: infer P_1) => infer R
      ? (...args: P_1) => R
      : never
    : T[P]
}

export type GetExternalMessageCell = (
  keyPair: KeyPair,
  transfers: WalletTransfer[]
) => Promise<Cell>

export interface ITonWalletBase {
  address: Address
  getExternalMessageCell: GetExternalMessageCell
  key: EncryptedWalletData
  id: number
  name?: string | null
  workchainId?: number | null
}

export interface ITonWalletV1R1 extends ITonWalletBase {
  type: 'v1R1'
  wallet: OpenedContract<WalletContractV1R1>
}

export interface ITonWalletV1R2 extends ITonWalletBase {
  type: 'v1R2'
  wallet: OpenedContract<WalletContractV1R2>
}

export interface ITonWalletV1R3 extends ITonWalletBase {
  type: 'v1R3'
  wallet: OpenedContract<WalletContractV1R3>
}

export interface ITonWalletV2R1 extends ITonWalletBase {
  type: 'v2R1'
  wallet: OpenedContract<WalletContractV2R1>
}

export interface ITonWalletV2R2 extends ITonWalletBase {
  type: 'v2R2'
  wallet: OpenedContract<WalletContractV2R2>
}

export interface ITonWalletV3R1 extends ITonWalletBase {
  type: 'v3R1'
  wallet: OpenedContract<WalletContractV3R1>
  subwalletId: number
}

export interface ITonWalletV3 extends ITonWalletBase {
  type: 'v3R2'
  wallet: OpenedContract<WalletContractV3R2>
  subwalletId: number
}

export interface ITonWalletV4 extends ITonWalletBase {
  type: 'v4R2'
  wallet: OpenedContract<WalletContractV4>
  subwalletId: number
}

export interface ITonWalletV5 extends ITonWalletBase {
  type: 'v5R1'
  wallet: OpenedContract<WalletV5>
  subwalletId: bigint
}

export interface ITonHighloadWalletV2 extends ITonWalletBase {
  type: 'highload'
  wallet: HighloadWalletV2
  subwalletId: number
}

export interface ITonHighloadWalletV2R2 extends ITonWalletBase {
  type: 'highload_v2r2'
  wallet: HighloadWalletV2R2
  subwalletId: number
}

export interface ITonHighloadWalletV3 extends ITonWalletBase {
  type: 'highload_v3'
  wallet: HighloadWalletV3
  subwalletId: number
  timeout: number
}

export interface ITonMultisigWalletV2V4R2 extends ITonWalletBase {
  type: 'multisig_v2_v4r2'
  wallet: OpenedContract<WalletContractV4>
  subwalletId: number
}

export interface ITonExternalWallet {
  type: 'external'
  id: string
  name?: string | null
}

export type ITonWalletsV1 = ITonWalletV1R1 | ITonWalletV1R2 | ITonWalletV1R3
export type ITonWalletsV2 = ITonWalletV2R1 | ITonWalletV2R2

export type IOldTonWallet = ITonWalletV3R1 | ITonWalletsV2 | ITonWalletsV1

export type ITonWallet = ITonWalletV3 | ITonWalletV4 | ITonWalletV5 | IOldTonWallet
export type IHighloadWalletV2 = ITonHighloadWalletV2 | ITonHighloadWalletV2R2
export type IHighloadWalletV3 = ITonHighloadWalletV3
export type IMultisigWallet = ITonMultisigWalletV2V4R2

export type IWallet = ITonWallet | IHighloadWalletV2 | IHighloadWalletV3 | IMultisigWallet

export type WalletType = IWallet['type']

export type TonWalletTransferArg = {
  seqno: number
  secretKey: Buffer
  messages: MessageRelaxed[]
  sendMode?: SendMode
  timeout?: number
}

export interface SavedWallet {
  id: number
  type: WalletType
  key_id: number
  subwallet_id: string
  wallet_address?: string | null
  extra_data?: string | null // json object with wallet specific data
  name?: string | null
  workchain_id?: number | null
}
