import { CHAIN, createDeviceInfo, TonWalletKit, type TonWalletKitOptions } from '@ton/walletkit'

/**
 * Build TonWalletKit config from environment variables.
 * Falls back to public toncenter endpoints and tonapi bridge when unset.
 */
function getConfigFromEnv(): TonWalletKitOptions {
  const mainnetUrl = import.meta.env.VITE_TONCENTER_MAINNET_URL || 'https://toncenter.com'
  const mainnetKey = import.meta.env.VITE_TONCENTER_MAINNET_KEY

  const testnetUrl = import.meta.env.VITE_TONCENTER_TESTNET_URL || 'https://testnet.toncenter.com'
  const testnetKey = import.meta.env.VITE_TONCENTER_TESTNET_KEY

  const bridgeUrl = import.meta.env.VITE_TON_BRIDGE_URL || 'https://bridge.tonapi.io/bridge'

  return {
    networks: {
      [CHAIN.MAINNET]: {
        apiClient: {
          url: mainnetUrl,
          key: mainnetKey,
        },
      },
      [CHAIN.TESTNET]: {
        apiClient: {
          url: testnetUrl,
          key: testnetKey,
        },
      },
    },
    bridge: {
      bridgeUrl,
    },
    deviceInfo: createDeviceInfo({
      platform: 'windows',
      appName: 'tonkeeper',
      appVersion: '0.3.3',
      maxProtocolVersion: 2,
      features: [
        {
          name: 'SendTransaction',
          maxMessages: 4,
          extraCurrencySupported: true,
        },
        {
          name: 'SignData',
          types: ['text', 'binary', 'cell'],
        },
      ],
    }),
  }
}

let walletKitPromise: Promise<TonWalletKit> | null = null

async function createWalletKitInstance() {
  const kit = new TonWalletKit(getConfigFromEnv())
  await kit.waitForReady()
  return kit
}

export async function getWalletKit(): Promise<TonWalletKit> {
  if (!walletKitPromise) {
    walletKitPromise = createWalletKitInstance()
  }
  return walletKitPromise
}
