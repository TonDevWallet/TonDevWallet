import { KeyPair } from 'tonweb-mnemonic/dist/types'
import { WalletContract } from 'tonweb/dist/types/contract/wallet/wallet-contract'
import { Address } from 'tonweb/dist/types/utils/address'

export interface IWallet {
  type: string
  address: Address
  wallet: WalletContract
  key: KeyPair
}
