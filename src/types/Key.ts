import { SavedWallet } from '.'

export interface Key {
  id: number
  words: string
  seed: string | undefined
  wallet_id: number
  name: string

  // not in db
  // keyPair?: KeyPair
  wallets?: SavedWallet[]
}
