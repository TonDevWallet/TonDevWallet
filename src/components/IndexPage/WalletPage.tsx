import { useEffect, useMemo } from 'react'

import Wallet from '@/components/wallets/tonweb/Wallet'
import HighloadWallet from '@/components/wallets/highload/Wallet'
import ExternalWallet from '@/components/wallets/external/Wallet'

import { IWallet } from '@/types'
// import { useProvider } from '@/utils'
import { WalletGenerator } from '@/components/WalletGenerator'
import { WalletsTable } from '@/components/WalletsTable'
import { NetworkSettings } from '@/components/NetworkSettings'

// const provider = new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC')

import { setSelectedWallet, useWallet } from '@/store/walletState'
import { useLiteclient } from '@/store/liteClient'
import { HighloadWalletV2 } from '@/contracts/highload-wallet-v2/HighloadWalletV2'
import { WalletContractV3R2, WalletContractV4 } from 'ton'
import { openLiteClient } from '@/utils/liteClientProvider'
import { LiteClient } from 'ton-lite-client'

export function WalletPage() {
  const liteClient = useLiteclient() as unknown as LiteClient

  useEffect(() => {
    console.log('liteclient hook')
    liteClient.getMasterchainInfo().then((res) => {
      console.log('info', res)
    })
  }, [])

  const wallet = useWallet()

  const wallets = useMemo<IWallet[]>(() => {
    const key = wallet.key.get()
    console.log('update wallet key', key?.keyPair)
    if (!key?.keyPair) {
      return []
    }

    // const walletId = key.wallet_id
    const keyPair = key.keyPair

    const highload = new HighloadWalletV2({
      publicKey: keyPair.publicKey,
      subwalletId: 1,
      workchain: 0,
    })

    const highloadAddress = highload.address

    const v4Contract = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey })
    const walletv4R2 = openLiteClient(liteClient, v4Contract)

    const walletv3R2 = openLiteClient(
      liteClient,
      WalletContractV3R2.create({ workchain: 0, publicKey: keyPair.publicKey })
    )

    console.log('wallet v4', walletv4R2)

    const v3R2Address = walletv3R2.address

    // eslint-disable-next-line new-cap
    const v4R2Address = walletv4R2.address

    const wallets: IWallet[] = [
      {
        type: 'v4R2',
        address: v4R2Address,
        wallet: walletv4R2,
        key: keyPair,
        id: 'v4R2',
      },
      {
        type: 'v3R2',
        address: v3R2Address,
        wallet: walletv3R2,
        key: keyPair,
        id: 'v3R2',
      },
      {
        type: 'highload',
        address: highloadAddress,
        wallet: highload,
        key: keyPair,
        id: 'highload',
      },
      {
        type: 'external',
        id: 'external',
      },
    ]

    setSelectedWallet(null)
    return wallets
  }, [wallet.key, liteClient])

  const walletsToShow = wallets

  return (
    <div className="grid grid-cols-[1fr_1fr] justify-center flex-col md:flex-row">
      {/* <div className="flex flex-1"> */}
      <div className="md:max-w-xl min-w-0 w-full flex-grow-0 px-4 flex flex-col mt-8">
        <h1 className="font-bold text-xl text-accent">TON Wallet</h1>
        Network
        <NetworkSettings
        // apiUrl={apiUrl}
        // apiKey={apiKey}
        // setApiUrl={setApiUrl}
        // setApiKey={setApiKey}
        />
        <WalletGenerator
        // words={words}
        // walletId={walletId}
        // keyPair={keyPair}
        // seed={seed}
        // setWords={setWords}
        // setWallet={setWallet}
        // setKeyPair={setKeyPair}
        // setWalletId={setWalletId}
        // setSeed={setSeed}
        />
        <WalletsTable walletsToShow={walletsToShow} />
      </div>
      <div className="md:max-w-xl min-w-0 w-full flex-grow-0 px-4 flex flex-col mt-16">
        {wallet.selectedWallet.get() ? (
          wallet.selectedWallet.get()?.type === 'highload' ? (
            <HighloadWallet />
          ) : wallet.selectedWallet.get()?.type === 'external' ? (
            <ExternalWallet />
          ) : (
            <Wallet />
          )
        ) : (
          <div>Click 'Use this wallet' on wallet you want to use</div>
        )}
      </div>
      {/* </div> */}
    </div>
  )
}
