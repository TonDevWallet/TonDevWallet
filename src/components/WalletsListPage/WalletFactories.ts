import { IWallet } from '@/types'
import {
  TonClient4,
  WalletContractV1R1,
  WalletContractV1R2,
  WalletContractV1R3,
  WalletContractV2R1,
  WalletContractV2R2,
  WalletContractV3R1,
  WalletContractV3R2,
  WalletContractV4,
} from '@ton/ton'
import { Address, Cell, Dictionary } from '@ton/core'
import { WalletV5 } from '@/contracts/w5/WalletV5R1'
import { WalletV5R1CodeCell } from '@/contracts/w5/WalletV5R1.source'
import {
  HighloadWalletV2,
  HighloadWalletV2R2,
} from '@/contracts/highload-wallet-v2/HighloadWalletV2'
import { HighloadWalletV3 } from '@/contracts/highload-wallet-v3/HighloadWalletV3'
import { HighloadWalletV3CodeCell } from '@/contracts/highload-wallet-v3/HighloadWalletV3.source'
import { Account } from 'tonapi-sdk-js'
import { LiteClient } from 'ton-lite-client'
import { getLastLiteBlock } from '@/utils/liteClientBlockchainStorage'

const TempClinet = new TonClient4({
  endpoint: 'empty',
})

const emptyWalletBase = {
  getExternalMessageCell: () => Promise.resolve(new Cell()),
  key: {
    cypher: 'encrypted-scrypt-tweetnacl',
    salt: '',
    N: 0,
    r: 0,
    p: 0,
  },
  id: 0,
} as const

export const defaultSubwalletIds = [
  0, // just zero
  698983191, // default subwallet id for v3, v4
  2147483409, // default subwallet id for w5
  2147483645, // w5 testnet
]

function getDefaultSubwalletIds() {
  const ids: number[] = []
  for (const id of defaultSubwalletIds) {
    for (let i = -10; i <= 10; i++) {
      if (id + i >= 0) {
        ids.push(id + i)
      }
    }
  }
  return ids
}

export const WalletFactories = {
  highload: (publicKey: Buffer): IWallet[] => {
    const wallets: IWallet[] = []
    for (const subwalletId of getDefaultSubwalletIds()) {
      const highload = new HighloadWalletV2({
        workchain: 0,
        publicKey,
        subwalletId,
      })
      wallets.push({
        ...emptyWalletBase,
        type: 'highload',
        wallet: highload,
        address: highload.address,
        subwalletId,
      })
    }

    return wallets
  },
  highload_v2r2: (publicKey: Buffer): IWallet[] => {
    const wallets: IWallet[] = []
    for (const subwalletId of getDefaultSubwalletIds()) {
      const highload = new HighloadWalletV2R2({
        workchain: 0,
        publicKey,
        subwalletId,
      })
      wallets.push({
        ...emptyWalletBase,
        type: 'highload_v2r2',
        wallet: highload,
        address: highload.address,
        subwalletId,
      })
    }

    return wallets
  },
  highload_v3: (publicKey: Buffer): IWallet[] => {
    const wallets: IWallet[] = []
    const workchainId = 0
    const timeouts = [60, 120, 600, 1440, 1800, 3600]
    for (const subwalletId of getDefaultSubwalletIds()) {
      for (const timeout of timeouts) {
        const highload = HighloadWalletV3.createFromConfig(
          {
            publicKey,
            subwalletId,
            timeout,
          },
          HighloadWalletV3CodeCell,
          workchainId
        )
        wallets.push({
          ...emptyWalletBase,
          type: 'highload_v3',
          wallet: highload,
          address: highload.address,
          subwalletId,
          timeout,
        })
      }
    }

    return wallets
  },
  v1R1: (publicKey: Buffer): IWallet[] => {
    const wallets: IWallet[] = []
    const v1r1 = TempClinet.open(
      WalletContractV1R1.create({
        workchain: 0,
        publicKey,
      })
    )
    wallets.push({
      ...emptyWalletBase,
      type: 'v1R1',
      wallet: v1r1,
      address: v1r1.address,
    })

    return wallets
  },
  v1R2: (publicKey: Buffer): IWallet[] => {
    const wallets: IWallet[] = []
    const v1r2 = TempClinet.open(
      WalletContractV1R2.create({
        workchain: 0,
        publicKey,
      })
    )
    wallets.push({
      ...emptyWalletBase,
      type: 'v1R2',
      wallet: v1r2,
      address: v1r2.address,
    })

    return wallets
  },
  v1R3: (publicKey: Buffer): IWallet[] => {
    const wallets: IWallet[] = []
    const v1r3 = TempClinet.open(
      WalletContractV1R3.create({
        workchain: 0,
        publicKey,
      })
    )
    wallets.push({
      ...emptyWalletBase,
      type: 'v1R3',
      wallet: v1r3,
      address: v1r3.address,
    })

    return wallets
  },
  v2R1: (publicKey: Buffer): IWallet[] => {
    const wallets: IWallet[] = []
    const v2r1 = TempClinet.open(
      WalletContractV2R1.create({
        workchain: 0,
        publicKey,
      })
    )
    wallets.push({
      ...emptyWalletBase,
      type: 'v2R1',
      wallet: v2r1,
      address: v2r1.address,
    })

    return wallets
  },
  v2R2: (publicKey: Buffer): IWallet[] => {
    const wallets: IWallet[] = []
    const v2r2 = TempClinet.open(
      WalletContractV2R2.create({
        workchain: 0,
        publicKey,
      })
    )
    wallets.push({
      ...emptyWalletBase,
      type: 'v2R2',
      wallet: v2r2,
      address: v2r2.address,
    })

    return wallets
  },
  v3R1: (publicKey: Buffer): IWallet[] => {
    const wallets: IWallet[] = []
    for (const subwalletId of getDefaultSubwalletIds()) {
      const v3r1 = TempClinet.open(
        WalletContractV3R1.create({
          workchain: 0,
          publicKey,
          walletId: subwalletId,
        })
      )
      wallets.push({
        ...emptyWalletBase,
        type: 'v3R1',
        wallet: v3r1,
        subwalletId,
        address: v3r1.address,
      })
    }
    return wallets
  },
  v3R2: (publicKey: Buffer): IWallet[] => {
    const wallets: IWallet[] = []
    for (const subwalletId of getDefaultSubwalletIds()) {
      const v3r2 = TempClinet.open(
        WalletContractV3R2.create({
          workchain: 0,
          publicKey,
          walletId: subwalletId,
        })
      )
      wallets.push({
        ...emptyWalletBase,
        type: 'v3R2',
        wallet: v3r2,
        subwalletId,
        address: v3r2.address,
      })
    }

    return wallets
  },
  v4R2: (publicKey: Buffer): IWallet[] => {
    const wallets: IWallet[] = []
    for (const subwalletId of getDefaultSubwalletIds()) {
      const v4r2 = TempClinet.open(
        WalletContractV4.create({
          workchain: 0,
          publicKey,
          walletId: subwalletId,
        })
      )
      wallets.push({
        ...emptyWalletBase,
        type: 'v4R2',
        wallet: v4r2,
        subwalletId,
        address: v4r2.address,
      })
    }

    return wallets
  },
  w5R1: (publicKey: Buffer): IWallet[] => {
    const wallets: IWallet[] = []
    for (const subwalletId of getDefaultSubwalletIds()) {
      const w5r1 = TempClinet.open(
        WalletV5.createFromConfig(
          {
            publicKey,
            walletId: BigInt(subwalletId),
            seqno: 0,
            extensions: Dictionary.empty(),
            signatureAllowed: true,
          },
          WalletV5R1CodeCell,
          0
        )
      )
      wallets.push({
        ...emptyWalletBase,
        type: 'v5R1',
        wallet: w5r1,
        subwalletId: BigInt(subwalletId),
        address: w5r1.address,
      })
    }

    return wallets
  },
}

// Helper function to create IWallet from tonapi wallet data
export async function createWalletFromTonapiData(
  publicKey: Buffer,
  tonapiWallet: Account,
  liteClient: LiteClient
): Promise<IWallet | null> {
  try {
    const address = Address.parse(tonapiWallet.address)

    // Map interface types based on tonapi wallet type
    const walletTypeMapping: Record<string, any> = {
      // wallet_v3r1: 'v3R1',
      wallet_v3r2: 'v3R2',
      wallet_v4r2: 'v4R2',
      wallet_v5r1: 'v5R1',
    }

    // Get wallet type from tonapi interface type
    const walletType =
      walletTypeMapping[tonapiWallet.interfaces?.join(' ')?.toLowerCase() ?? ''] || 'v4R2'

    // Create appropriate wallet object based on type
    if (walletType === 'v4R2') {
      const master = await getLastLiteBlock(liteClient)
      const accountState = await liteClient.getAccountState(address, master.last)
      const data =
        accountState?.state?.storage?.state?.type === 'active' &&
        accountState?.state?.storage?.state?.state?.data

      if (!data) {
        return null
      }

      const dataSlice = data.beginParse()
      const subwalletId = dataSlice.skip(32).loadUint(32)

      const wallet = liteClient.open(
        WalletContractV4.create({
          publicKey,
          workchain: 0,
          walletId: subwalletId,
        })
      )

      return {
        ...emptyWalletBase,
        type: 'v4R2',
        address,
        wallet,
        subwalletId,
      }
    } else if (walletType === 'v3R2') {
      const master = await getLastLiteBlock(liteClient)
      const accountState = await liteClient.getAccountState(address, master.last)
      const data =
        accountState?.state?.storage?.state?.type === 'active' &&
        accountState?.state?.storage?.state?.state?.data

      if (!data) {
        return null
      }

      const dataSlice = data.beginParse()
      const subwalletId = dataSlice.skip(32).loadUint(32)

      const walletv3r2 = liteClient.open(
        WalletContractV3R2.create({
          publicKey,
          workchain: 0,
          walletId: subwalletId,
        })
      )

      return {
        ...emptyWalletBase,
        type: 'v3R2',
        address,
        wallet: walletv3r2,
        subwalletId,
      }
    } else if (walletType === 'v5R1') {
      const master = await getLastLiteBlock(liteClient)
      const accountState = await liteClient.getAccountState(address, master.last)
      const data =
        accountState?.state?.storage?.state?.type === 'active' &&
        accountState?.state?.storage?.state?.state?.data

      if (!data) {
        return null
      }

      const dataSlice = data.beginParse()
      const subwalletId = dataSlice.skip(1 + 32).loadUint(32)

      const walletv5r1 = liteClient.open(
        WalletV5.createFromConfig(
          {
            publicKey,
            walletId: BigInt(subwalletId),
            seqno: 0,
            extensions: Dictionary.empty(),
            signatureAllowed: true,
          },
          WalletV5R1CodeCell,
          0
        )
      )

      return {
        ...emptyWalletBase,
        type: 'v5R1',
        address,
        wallet: walletv5r1,
        subwalletId: BigInt(subwalletId),
      }
    } else {
      return null
    }
  } catch (error) {
    console.error('Error creating wallet from tonapi data:', error, tonapiWallet)
    return null
  }
}
