import { useEffect, useMemo } from 'react'

import Wallet from '@/components/wallets/tonweb/Wallet'
import HighloadWallet from '@/components/wallets/highload/Wallet'

import { IWallet } from '@/types'
import { WalletGenerator } from '@/components/WalletGenerator'
import { WalletsTable } from '@/components/WalletsTable'

import { setWalletKey, useSelectedKey, useSelectedWallet } from '@/store/walletState'
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
    console.log('update wallet key', key?.seed, key?.wallets.get())
    if (!key?.seed) {
      return []
    }

    // const walletKeyPair = useMemo(
    //   () => keyPairFromSeed(Buffer.from(key.seed.get() || '', 'hex')),
    //   [key.seed]
    // )

    // const walletId = key.wallet_id
    // const keyPair = key.keyPair.get()
    // console.log('keypair', keyPair)
    // if (!keyPair) {
    //   return []
    // }

    const wallets: IWallet[] =
      key.wallets.get()?.map((w) => {
        console.log('get wallet', w)
        const newWallet = getWalletFromKey(liteClient, key, w)
        if (!newWallet) {
          throw new Error('no wallet')
        }

        return newWallet
      }) || []

    // setSelectedWallet(null)
    return wallets
  }, [key, key?.wallets, liteClient])

  const walletsToShow = wallets

  return (
    <div className="grid grid-cols-[1fr_1fr] gap-4 justify-center flex-col md:flex-row">
      {/* <div className="flex flex-1"> */}
      <div className="md:max-w-xl min-w-0 w-full flex-grow-0 flex flex-col">
        {/* <h1 className="font-bold text-xl text-accent">TON Wallet</h1> */}
        <WalletGenerator />
        <WalletsTable walletsToShow={walletsToShow} />
      </div>
      <div className="md:max-w-xl min-w-0 w-full flex-grow-0 flex flex-col mt-2">
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
