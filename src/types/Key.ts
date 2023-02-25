import { EncryptedWalletData } from '@/store/passwordManager'
import { Generated } from 'kysely'
import { SavedWallet } from '.'

export interface Key {
  id: Generated<number>
  // words: string
  // seed: string | undefined
  encrypted: string
  public_key: string
  name: string

  // not in db
  // keyPair?: KeyPair
  wallets?: SavedWallet[]
  encryptedData?: EncryptedWalletData
}
