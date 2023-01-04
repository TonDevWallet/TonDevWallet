import { setSelectedWallet, setWalletKey, useWallet } from '@/store/walletState'
import { IWallet } from '@/types'
import { Key } from '@/types/Key'
import { useState, useCallback, useEffect } from 'react'
import Jazzicon from 'react-jazzicon'
import { mnemonicToSeed } from 'tonweb-mnemonic'

export function SavedWalletRow({
  walletKey,
  // words,

  updateMnemonic,
}: {
  walletKey: Key
  // wallet: IWallet | undefined
  // words: string[]

  updateMnemonic: (words?: string[]) => void
}) {
  const wallet = useWallet()
  const [jazzNumber, setJazzNumber] = useState(0)

  const getJazziconSeed = useCallback(async () => {
    const sd = await mnemonicToSeed(walletKey.words.split(' '))
    const number = parseInt(sd.slice(0, 10).toString())
    console.log('number', number)
    setJazzNumber(number)
  }, [walletKey.words])

  useEffect(() => {
    getJazziconSeed()
  }, [])

  console.log('wallet id', walletKey.id, wallet.key.get()?.id)

  return (
    <div
      className={
        'rounded p-1 flex flex-col items-center my-2 select-none ' +
          (walletKey.id === wallet.key.get()?.id && 'bg-gray-300') || ''
      }
      onClick={() => {
        setWalletKey({ ...walletKey })
        setSelectedWallet(null)
      }}
    >
      {jazzNumber ? <Jazzicon diameter={64} seed={jazzNumber} /> : <div className="w-16 h-16" />}

      <div>{walletKey.name}</div>
    </div>
  )
}
