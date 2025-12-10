import {
  type ApiClient,
  CHAIN,
  type IWalletAdapter,
  type TonWalletKit,
  createWalletId,
  type TonProofParsedMessage,
  PrepareSignDataResult,
  ConnectTransactionParamContent,
  DefaultSignature,
  Hex,
  CreateTonProofMessageBytes,
} from '@ton/walletkit'
import { type IWallet } from '@/types'
import { getStateInitBoc } from '@/utils/walletStateInit'
import { GetTransfersFromTCMessage } from '@/utils/tonConnect'
import { secretKeyToED25519 } from '@/utils/ed25519'
// import { CreateMessage } from '@/utils/tonProof'
import { getPassword, getPasswordInteractive, decryptWalletData } from '@/store/passwordManager'
import { getWalletListState } from '@/store/walletsListState'
import { getWalletFromKey } from '@/utils/wallets'
import { LiteClientState } from '@/store/liteClient'

/**
 * Function type for getting the secret key for a wallet address.
 * Returns the key pair or undefined if not available.
 */
export type GetSecretKeyFn = (
  walletAddress: string
) => Promise<{ secretKey: Buffer; publicKey: Buffer } | undefined>

/**
 * Default implementation that gets secret key from password manager.
 * Looks up the key by wallet address and decrypts using the current password.
 */
async function defaultGetSecretKey(
  walletAddress: string
): Promise<{ secretKey: Buffer; publicKey: Buffer } | undefined> {
  const password = getPassword()
  if (!password) {
    // Try to get password interactively
    const interactivePassword = await getPasswordInteractive()
    if (!interactivePassword) {
      return undefined
    }
  }

  const currentPassword = getPassword()
  if (!currentPassword) {
    return undefined
  }

  // Find the key that owns this wallet address
  const keys = getWalletListState().get({ noproxy: true }) || []
  const liteClient = LiteClientState.liteClient.get()

  for (const key of keys) {
    if (!key.encrypted || !key.wallets) continue

    for (const wallet of key.wallets) {
      // Check saved wallet_address first
      if (wallet.wallet_address === walletAddress) {
        const decrypted = await decryptWalletData(currentPassword, key.encrypted)
        if (decrypted?.seed) {
          const keyPair = secretKeyToED25519(decrypted.seed)
          return {
            secretKey: Buffer.from(keyPair.secretKey),
            publicKey: Buffer.from(keyPair.publicKey),
          }
        }
      }

      // Also check derived address from wallet contract
      if (liteClient) {
        const tonWallet = getWalletFromKey(liteClient, key, wallet)
        if (tonWallet?.address.toRawString() === walletAddress) {
          const decrypted = await decryptWalletData(currentPassword, key.encrypted)
          if (decrypted?.seed) {
            const keyPair = secretKeyToED25519(decrypted.seed)
            return {
              secretKey: Buffer.from(keyPair.secretKey),
              publicKey: Buffer.from(keyPair.publicKey),
            }
          }
        }
      }
    }
  }

  return undefined
}

class ExistingWalletAdapter implements IWalletAdapter {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly kit: TonWalletKit,
    private readonly wallet: IWallet,
    private readonly chain: CHAIN,
    private readonly publicKey: Hex,
    private readonly stateInitBoc: string,
    private readonly getSecretKey: GetSecretKeyFn
  ) {}

  getPublicKey() {
    return this.publicKey
  }

  getNetwork() {
    return this.chain
  }

  getClient(): ApiClient {
    return this.kit.getApiClient(this.chain)
  }

  getAddress() {
    return this.wallet.address.toRawString()
  }

  getWalletId() {
    return createWalletId(this.chain, this.wallet.address.toRawString())
  }

  async getStateInit() {
    return this.stateInitBoc
  }

  private async requireSecretKey(): Promise<{ secretKey: Buffer; publicKey: Buffer }> {
    const keyPair = await this.getSecretKey(this.wallet.address.toRawString())
    if (!keyPair) {
      throw new Error('No signer available - wallet not unlocked')
    }
    return keyPair
  }

  async getSignedSendTransaction(input: ConnectTransactionParamContent) {
    const keyPair = await this.requireSecretKey()
    const edKeyPair = secretKeyToED25519(keyPair.secretKey)
    const transfers = GetTransfersFromTCMessage(input.messages as any)
    const cell = await this.wallet.getExternalMessageCell(edKeyPair, transfers)
    return cell.toBoc().toString('base64')
  }

  async getSignedSignData(input: PrepareSignDataResult) {
    const keyPair = await this.requireSecretKey()
    const edKeyPair = secretKeyToED25519(keyPair.secretKey)
    const signature = DefaultSignature(
      Buffer.from(input.hash.replace(/^0x/, ''), 'hex'),
      edKeyPair.secretKey
    )
    return signature
  }

  async getSignedTonProof(message: TonProofParsedMessage) {
    const keyPair = await this.requireSecretKey()
    const bytes = await CreateTonProofMessageBytes(message)
    const edKeyPair = secretKeyToED25519(keyPair.secretKey)
    const signature = DefaultSignature(Buffer.from(bytes), edKeyPair.secretKey)
    return signature
  }
}

// Store adapters so we can track which wallets we've registered
const adapterRegistry = new Map<string, ExistingWalletAdapter>()

function getAdapterKey(address: string, chain: CHAIN): string {
  return `${chain}:${address}`
}

export async function ensureKitWalletRegistered(
  kit: TonWalletKit,
  wallet: IWallet,
  chain: CHAIN,
  publicKey: Hex,
  getSecretKey: GetSecretKeyFn = defaultGetSecretKey
) {
  const address = wallet.address.toRawString()
  const adapterKey = getAdapterKey(address, chain)

  // Check if we already have an adapter in our registry
  const existingAdapter = adapterRegistry.get(adapterKey)
  if (existingAdapter) {
    return kit.getWalletByAddressAndNetwork(address, chain)
  }

  // Check if wallet exists in kit but not in our registry
  // This can happen after reload - WalletKit persists wallets but our registry is in-memory
  const existingKitWallet = kit.getWalletByAddressAndNetwork(address, chain)
  if (existingKitWallet) {
    // Remove the old wallet and re-add with our adapter so we can control signing
    await kit.removeWallet(existingKitWallet.getWalletId())
  }

  // Create new adapter with runtime secret key resolution
  const adapter = new ExistingWalletAdapter(
    kit,
    wallet,
    chain,
    publicKey,
    getStateInitBoc(wallet),
    getSecretKey
  )

  adapterRegistry.set(adapterKey, adapter)
  await kit.addWallet(adapter)
  return kit.getWalletByAddressAndNetwork(address, chain)
}

/**
 * Clears the adapter registry. Useful for testing or when resetting state.
 */
export function clearAdapterRegistry() {
  adapterRegistry.clear()
}
