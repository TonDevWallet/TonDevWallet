import TonWeb from 'tonweb'

import { useState } from 'react'
import { KeyPair } from 'tonweb-mnemonic'
import { useAsync } from 'react-async-hook'

import Wallet from './components/wallets/tonweb/Wallet'
import HighloadWallet from './components/wallets/highload/Wallet'
import ExternalWallet from './components/wallets/external/Wallet'

import { IWallet } from './types'
import { useProvider } from './utils'
import { WalletGenerator } from './components/WalletGenerator'
import { WalletsTable } from './components/WalletsTable'
import { NetworkSettings } from './components/NetworkSettings'
import { ContractHighloadWalletV2 } from './contracts/HighloadWalletV2'

// const provider = new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC')

export function App() {
  const [words, setWords] = useState<string[]>([])
  const [wallet, setWallet] = useState<IWallet | undefined>(undefined)
  const [keyPair, setKeyPair] = useState<KeyPair | undefined>(undefined)
  const [walletId, setWalletId] = useState<number>(698983191) // default wallet id

  const [apiUrl, setApiUrl] = useState('')
  const [apiKey, setApiKey] = useState<string>('')

  const provider = useProvider(apiUrl, apiKey)

  const wallets = useAsync<IWallet[]>(async () => {
    if (!keyPair) {
      return []
    }

    const highload = new ContractHighloadWalletV2(0, keyPair.publicKey, 1)
    const highloadAddress = highload.address

    // eslint-disable-next-line new-cap
    const walletv3R1 = new TonWeb.Wallets.all.v3R1(provider, {
      publicKey: keyPair.publicKey,
      walletId,
    })
    const v3R1Address = await walletv3R1.getAddress()

    // eslint-disable-next-line new-cap
    const walletv3R2 = new TonWeb.Wallets.all.v3R2(provider, {
      publicKey: keyPair.publicKey,
      walletId,
    })
    const v3R2Address = await walletv3R2.getAddress()

    // eslint-disable-next-line new-cap
    const walletv4R2 = new TonWeb.Wallets.all.v4R2(provider, {
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
  }, [keyPair, walletId])

  const walletsToShow = wallets.result

  return (
    <div className="flex justify-center flex-col md:flex-row">
      <div className="md:max-w-xl w-full px-4 flex flex-col mt-8">
        <h1 className="font-bold text-xl text-accent">TON Wallet</h1>

        <NetworkSettings
          apiUrl={apiUrl}
          apiKey={apiKey}
          setApiUrl={setApiUrl}
          setApiKey={setApiKey}
        />

        <WalletGenerator
          words={words}
          walletId={walletId}
          keyPair={keyPair}
          setWords={setWords}
          setWallet={setWallet}
          setKeyPair={setKeyPair}
          setWalletId={setWalletId}
        />

        <WalletsTable currentWallet={wallet} walletsToShow={walletsToShow} setWallet={setWallet} />
      </div>
      <div className="md:max-w-xl w-full px-4 flex flex-col mt-16">
        {wallet ? (
          wallet.type === 'highload' ? (
            <HighloadWallet wallet={wallet} apiUrl={apiUrl} apiKey={apiKey} />
          ) : wallet.type === 'external' ? (
            <ExternalWallet apiUrl={apiUrl} apiKey={apiKey} />
          ) : (
            <Wallet wallet={wallet} apiUrl={apiUrl} apiKey={apiKey} />
          )
        ) : (
          <div>Click 'Use this wallet' on wallet you want to use</div>
        )}
      </div>
    </div>
  )
}
