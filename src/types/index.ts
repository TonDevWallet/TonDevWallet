import { KeyPair } from 'tonweb-mnemonic/dist/types'
import { Address as Ton3Address } from 'ton3-core'
import { WalletContract } from 'tonweb/dist/types/contract/wallet/wallet-contract'
import { Address } from 'tonweb/dist/types/utils/address'
import { ContractHighloadWalletV2 } from '../contracts/HighloadWalletV2'

export interface ITonWebWallet {
  type: 'v3R2' | 'v3R1' | 'v4R2'
  address: Address
  wallet: WalletContract
  key: KeyPair
}

export interface ITonHighloadWalletV2 {
  type: 'highload'
  address: Ton3Address
  wallet: ContractHighloadWalletV2
  key: KeyPair
}

export type IWallet = ITonWebWallet | ITonHighloadWalletV2
