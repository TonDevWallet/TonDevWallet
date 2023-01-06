import TonWeb from 'tonweb'

import React, { useEffect } from 'react'
import { useAsync } from 'react-async-hook'

import Wallet from '@/components/wallets/tonweb/Wallet'
import HighloadWallet from '@/components/wallets/highload/Wallet'
import ExternalWallet from '@/components/wallets/external/Wallet'

import { IWallet } from '@/types'
// import { useProvider } from '@/utils'
import { WalletGenerator } from '@/components/WalletGenerator'
import { WalletsTable } from '@/components/WalletsTable'
import { NetworkSettings } from '@/components/NetworkSettings'

// const provider = new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC')

import { SavedWalletsList } from '../SavedWalletsList/SavedWalletsList'
import { useWallet } from '@/store/walletState'
import { useLiteclient } from '@/store/liteClient'
import { HighloadWalletV2 } from '@/contracts/highload-wallet-v2/HighloadWalletV2'
import { Address } from 'ton'

export function IndexPage() {
  const liteClient = useLiteclient()

  useEffect(() => {
    console.log('liteclient hook')
    liteClient.getMasterchainInfo().then((res) => {
      console.log('info', res)
    })
  }, [])

  const wallet = useWallet()

  const wallets = useAsync<IWallet[]>(async () => {
    const key = wallet.key.get()
    console.log('update wallet key', key?.keyPair)
    if (!key?.keyPair) {
      return []
    }

    const walletId = key.wallet_id
    const keyPair = key.keyPair

    const highload = new HighloadWalletV2({
      publicKey: keyPair.publicKey,
      subwalletId: 1,
      workchain: 0,
    })
    const highloadAddress = highload.address

    // eslint-disable-next-line new-cap
    const walletv3R2 = new TonWeb.Wallets.all.v3R2(new TonWeb.HttpProvider(), {
      publicKey: keyPair.publicKey,
      walletId,
    })
    const v3R2Address = await walletv3R2.getAddress()

    // eslint-disable-next-line new-cap
    const walletv4R2 = new TonWeb.Wallets.all.v4R2(new TonWeb.HttpProvider(), {
      publicKey: keyPair.publicKey,
      walletId,
    })
    const v4R2Address = await walletv4R2.getAddress()

    const wallets: IWallet[] = [
      {
        type: 'v4R2',
        address: Address.parse(v4R2Address.toString()),
        wallet: walletv4R2,
        key: keyPair,
        id: 'v4R2',
      },
      {
        type: 'v3R2',
        address: Address.parse(v3R2Address.toString()),
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

    return wallets
  }, [wallet.key])

  const walletsToShow = wallets.result

  return (
    <div className="grid grid-cols-[128px_1fr_1fr] justify-center flex-col md:flex-row">
      <div className="flex-shrink-0">
        <React.Suspense fallback={<div>Loading</div>}>
          <SavedWalletsList
          // wallet={wallet}
          // words={words}
          // setWords={setWords}
          // seed={seed}
          // setSeed={setSeed}
          // setKeyPair={setKeyPair}
          // setWallet={setWallet}
          />
        </React.Suspense>
      </div>

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
