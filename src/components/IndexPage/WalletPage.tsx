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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWallet } from '@fortawesome/free-solid-svg-icons'

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
    if (!key?.public_key) {
      return []
    }

    const wallets: IWallet[] =
      key.wallets.get()?.map((w) => {
        console.log('get wallet from key', liteClient, key, w)
        const newWallet = getWalletFromKey(liteClient, key, w)
        if (!newWallet) {
          throw new Error('no wallet')
        }

        return newWallet
      }) || []

    return wallets
  }, [key, key?.wallets, liteClient])

  const walletsToShow = wallets

  return (
    <div className="grid grid-cols-[1fr_1fr] gap-4 justify-center flex-col md:flex-row">
      {/* <div className="flex flex-1"> */}
      <div className="md:max-w-xl min-w-0 w-full flex-grow-0 flex flex-col">
        <h1 className="font-bold text-xl mt-2 mb-4">Wallet {key?.name.get()}</h1>
        <WalletGenerator />
        <WalletsTable walletsToShow={walletsToShow} />
      </div>
      <div className="md:max-w-xl min-w-0 w-full flex-grow-0 flex flex-col mt-[6.75rem]">
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
          <div className="flex flex-col justify-center h-screen mt-[-6.75rem]">
            <div className="flex flex-col items-center text-gray-500">
              <FontAwesomeIcon icon={faWallet} className="mr-1" size={'4x'} />
              <div className="mt-2">Select wallet</div>
            </div>
          </div>
        )}
      </div>
      {/* </div> */}
    </div>
  )
}
