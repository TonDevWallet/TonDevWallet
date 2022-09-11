import { IWallet } from '@/types'
import { useState, useCallback, useEffect } from 'react'
import Jazzicon from 'react-jazzicon'
import { mnemonicToSeed } from 'tonweb-mnemonic'

export function SavedWalletRow({
  walletWords,
  words,

  updateMnemonic,
}: {
  walletWords: string[]
  wallet: IWallet | undefined
  words: string[]

  updateMnemonic: (words?: string[]) => void
}) {
  const [jazzNumber, setJazzNumber] = useState(0)

  const getJazziconSeed = useCallback(async () => {
    const sd = await mnemonicToSeed(walletWords)
    const number = parseInt(sd.slice(0, 10).toString())
    console.log('number', number)
    setJazzNumber(number)
  }, [walletWords])

  useEffect(() => {
    getJazziconSeed()
  }, [])

  return (
    <div
      className={
        'rounded p-1 flex flex-col items-center my-2 select-none ' +
          (walletWords.join(' ') === words.join(' ') && 'bg-gray-300') || ''
      }
      onClick={() => {
        updateMnemonic(walletWords)
      }}
    >
      {jazzNumber ? <Jazzicon diameter={64} seed={jazzNumber} /> : <div className="w-16 h-16" />}

      <div>{walletWords.slice(0, 10)}</div>
    </div>
  )
}
