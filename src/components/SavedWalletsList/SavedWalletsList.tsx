import { useDatabase } from '@/db'
import { IWallet } from '@/types'
import { useAsync } from 'react-async-hook'
import { generateMnemonic, KeyPair, mnemonicToKeyPair, mnemonicToSeed } from 'tonweb-mnemonic'
import Jazzicon from 'react-jazzicon'
import { SavedWalletRow } from './SavedWalletRow'
import { useWallets } from '../useWallets'

export function SavedWalletsList({
  wallet,
  words,
  setWords,
  seed,
  setSeed,
  setKeyPair,
  setWallet,
}: {
  wallet: IWallet | undefined
  words: string[]
  setWords: (words: string[]) => void
  seed: Uint8Array | undefined
  setSeed: (s: Uint8Array) => void
  setKeyPair: (s: KeyPair) => void
  setWallet: (s: IWallet | undefined) => void
}) {
  const wallets = useWallets()
  // const db = useDatabase()
  // console.log('walletslist update')

  // console.log('wallet?', wallet)
  // const wallets = useAsync(async () => {
  //   console.log('got wallets from db')
  //   const res = await db.select<{ name: string }[]>(`SELECT * FROM files`)

  //   console.log('words', words)
  //   if (!words.length) {
  //     if (res.length) {
  //       updateMnemonic(res[0].name.split(' '))
  //     } else {
  //       updateMnemonic()
  //     }
  //   }
  //   return res
  // }, [db])

  // useEffect(() => {
  //   console.log('effect', words)
  //   const tm = setTimeout(() => {
  //     console.log('effect timeout')
  //     if (words.length === 0) {
  //       generate()
  //     }
  //   }, 256)

  //   return () => clearTimeout(tm)
  // }, [words])

  const updateMnemonic = async (words?: string[]) => {
    console.log('generate')
    const mnemonic = words || (await generateMnemonic())
    const keyPair = await mnemonicToKeyPair(mnemonic)
    const sd = await mnemonicToSeed(mnemonic)

    setWords(mnemonic)
    setSeed(sd)
    setKeyPair(keyPair)
    setWallet(undefined)
  }

  return (
    <div className="p-2">
      {wallets &&
        wallets.map((dbWallet) => (
          <SavedWalletRow
            updateMnemonic={updateMnemonic}
            wallet={wallet}
            walletWords={dbWallet.name.split(' ')}
            words={words}
          />
        ))}

      <div onClick={() => updateMnemonic()}>New wallet</div>
    </div>
  )
}
