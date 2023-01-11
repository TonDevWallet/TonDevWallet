import { useEffect, useMemo } from 'react'

import Wallet from '@/components/wallets/tonweb/Wallet'
import HighloadWallet from '@/components/wallets/highload/Wallet'

import { IWallet } from '@/types'
// import { useProvider } from '@/utils'
import { WalletGenerator } from '@/components/WalletGenerator'
import { WalletsTable } from '@/components/WalletsTable'
import { NetworkSettings } from '@/components/NetworkSettings'

// const provider = new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC')

import {
  setSelectedWallet,
  setWalletKey,
  useSelectedKey,
  useSelectedWallet,
} from '@/store/walletState'
import { useLiteclient } from '@/store/liteClient'
import { LiteClient } from 'ton-lite-client'
import { useParams } from 'react-router-dom'
import { useWalletListState } from '@/store/walletsListState'
import { getWalletFromKey } from '@/utils/wallets'

export function WalletPage() {
  const liteClient = useLiteclient() as unknown as LiteClient
  const urlParams = useParams()
  const walletsList = useWalletListState()

  useEffect(() => {
    console.log('liteclient hook')
    liteClient.getMasterchainInfo().then((res) => {
      console.log('info', res)
    })
  }, [])

  useEffect(() => {
    const id = parseInt(urlParams.walletId || '')
    const selectedWallet = walletsList.get().find((i) => i.id === id)
    if (selectedWallet) {
      setWalletKey(selectedWallet.id)
    }
  }, [urlParams.walletId])

  const key = useSelectedKey()
  const selectedWallet = useSelectedWallet()

  const wallets = useMemo<IWallet[]>(() => {
    // const key = wallet.get({ noproxy: true })
    console.log('update wallet key', key?.keyPair)
    if (!key?.keyPair) {
      return []
    }

    // const walletId = key.wallet_id
    const keyPair = key.keyPair.get()
    console.log('keypair', keyPair)
    if (!keyPair) {
      return []
    }

    const wallets: IWallet[] =
      key.wallets.get()?.map((w) => {
        // const  =
        // const k = wallet.get().key!
        const newWallet = getWalletFromKey(liteClient, key, w)
        if (!newWallet) {
          throw new Error('no wallet')
        }

        return newWallet
        // const wallet =
        //   w.type === 'highload'
        //     ? new HighloadWalletV2({
        //         publicKey: keyPair.publicKey,
        //         subwalletId: 1,
        //         workchain: 0,
        //       })
        //     : w.type === 'v3R2'
        //     ? openLiteClient(
        //         liteClient,
        //         WalletContractV3R2.create({
        //           workchain: 0,
        //           publicKey: keyPair.publicKey,
        //           walletId: w.subwallet_id,
        //         })
        //       )
        //     : openLiteClient(
        //         liteClient,
        //         WalletContractV4.create({
        //           workchain: 0,
        //           publicKey: keyPair.publicKey,
        //           walletId: w.subwallet_id,
        //         })
        //       )

        // return {
        //   type: w.type,
        //   address: wallet.address,
        //   wallet,
        //   key: keyPair,
        //   id: w.id,
        //   subwalletId: 0,
        // } as IWallet
      }) || []

    setSelectedWallet(null)
    return wallets
  }, [key, liteClient])

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
        {selectedWallet ? (
          selectedWallet?.type === 'highload' ? (
            <HighloadWallet />
          ) : (
            // : wallet.selectedWallet.get()?.type === 'external' ? (
            // <ExternalWallet />
            // )
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
