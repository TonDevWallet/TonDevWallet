import TonWeb from 'tonweb'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { KeyPair, mnemonicToKeyPair } from 'tonweb-mnemonic'
import { useAsync } from 'react-async-hook'
import { suspend } from '@hookstate/core'

import Wallet from '@/components/wallets/tonweb/Wallet'
import HighloadWallet from '@/components/wallets/highload/Wallet'
import ExternalWallet from '@/components/wallets/external/Wallet'

import { IWallet } from '@/types'
// import { useProvider } from '@/utils'
import { WalletGenerator } from '@/components/WalletGenerator'
import { WalletsTable } from '@/components/WalletsTable'
import { NetworkSettings } from '@/components/NetworkSettings'
import { ContractHighloadWalletV2 } from '@/contracts/HighloadWalletV2'

// const provider = new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC')

import { SavedWalletsList } from '../SavedWalletsList/SavedWalletsList'
import { useLiteclient } from '@/liteClient'
import { useWallet } from '@/store/walletState'
import { useTonClient } from '@/store/tonClient'

export function IndexPage() {
  const liteClient = useLiteclient()

  useEffect(() => {
    console.log('liteclient hook')
    liteClient.getMasterchainInfo().then((res) => {
      console.log('info', res)
    })
  }, [])

  const wallet = useWallet()

  // const [words, setWords] = useState<string[]>([])
  // const [wallet, setWallet] = useState<IWallet | undefined>(undefined)
  // const [keyPair, setKeyPair] = useState<KeyPair | undefined>(undefined)
  // const [walletId, setWalletId] = useState<number>(698983191) // default wallet id
  // const [seed, setSeed] = useState<Uint8Array | undefined>(undefined)

  const [apiUrl, setApiUrl] = useState('')
  const [apiKey, setApiKey] = useState<string>('')

  // const updateSeed = useCallback(async () => {
  //   // const sd = await mnemonicToSeed(words)
  //   const keyPair = await mnemonicToKeyPair(wallet.)
  //   setKeyPair(keyPair)
  // }, [wallet.key])

  // useEffect(() => {
  //   updateSeed()
  // }, [updateSeed])

  // const provider = useProvider(apiUrl, apiKey)
  const tonClient = useTonClient()

  const wallets = useAsync<IWallet[]>(async () => {
    const key = wallet.key.get()
    console.log('update wallet key', key?.keyPair)
    if (!key?.keyPair) {
      return []
    }

    const walletId = key.wallet_id
    const keyPair = key.keyPair

    const highload = new ContractHighloadWalletV2(0, keyPair.publicKey, 1)
    const highloadAddress = highload.address

    // eslint-disable-next-line new-cap
    const walletv3R1 = new TonWeb.Wallets.all.v3R1(new TonWeb.HttpProvider(), {
      publicKey: key.keyPair.publicKey,
      // walletId: key.walletId,
    })
    const v3R1Address = await walletv3R1.getAddress()

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

    return [
      {
        type: 'v4R2',
        address: v4R2Address,
        balance: '0',
        wallet: walletv4R2,
        key: keyPair,
        id: 'v4R2',
      },
      {
        type: 'v3R2',
        address: v3R2Address,
        balance: '0',
        wallet: walletv3R2,
        key: keyPair,
        id: 'v3R2',
      },
      {
        type: 'highload',
        address: highloadAddress,
        balance: '0',
        wallet: highload,
        key: keyPair,
        id: 'highload',
      },
      {
        type: 'v3R1',
        address: v3R1Address,
        balance: '0',
        wallet: walletv3R1,
        key: keyPair,
        id: 'v3R1',
      },
      {
        type: 'external',
        id: 'external',
      },
    ]
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
