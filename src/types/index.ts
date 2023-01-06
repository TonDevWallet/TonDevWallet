import { KeyPair } from 'tonweb-mnemonic/dist/types'
import { WalletContract } from 'tonweb/dist/types/contract/wallet/wallet-contract'
// import { Address } from 'tonweb/dist/types/utils/address'
import { HighloadWalletV2 } from '@/contracts/highload-wallet-v2/HighloadWalletV2'
import { Address } from 'ton'

export interface ITonWebWallet {
  type: 'v3R2' | 'v3R1' | 'v4R2'
  address: Address
  wallet: WalletContract
  key: KeyPair
  id: string
}

export interface ITonHighloadWalletV2 {
  type: 'highload'
  address: Address
  wallet: HighloadWalletV2
  key: KeyPair
  id: string
}

export interface ITonExternalWallet {
  type: 'external'
  id: string
}

export type IWallet = ITonWebWallet | ITonHighloadWalletV2 | ITonExternalWallet
