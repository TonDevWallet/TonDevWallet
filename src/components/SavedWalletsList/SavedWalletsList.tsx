import { IWallet } from '@/types'
import { generateMnemonic, KeyPair, mnemonicToSeed } from 'tonweb-mnemonic'
import { SavedWalletRow } from './SavedWalletRow'
import { suspend } from '@hookstate/core'
import { useWalletListState } from '@/store/walletsListState'
import { setSelectedWallet, setWalletKey, useWallet } from '@/store/walletState'
import { mnemonicToPrivateKey } from 'ton-crypto'

export function SavedWalletsList() {
  const wallets = useWalletListState()
  // const tasks = useTasksState()
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

  const wallet = useWallet()

  const updateMnemonic = async (words?: string[]) => {
    console.log('generate')
    const mnemonic = words || (await generateMnemonic())
    // const keyPair = await mnemonicToKeyPair(mnemonic)
    const sd = await mnemonicToSeed(mnemonic)

    setWalletKey({
      id: 0,
      name: '',
      seed: Buffer.from(sd).toString('hex'),
      wallet_id: wallet.key.get()?.wallet_id || 0,
      words: mnemonic.join(' '),
      keyPair: await mnemonicToPrivateKey(mnemonic),
    })
    setSelectedWallet(null)
    // setWalletKey({

    // })
    // setWords(mnemonic)
    // setSeed(sd)
    // setKeyPair(keyPair)
    // setWallet(undefined)
  }

  return (
    suspend(wallets) || (
      <div className="p-2">
        {wallets &&
          wallets.map((dbWallet) => (
            <SavedWalletRow
              updateMnemonic={updateMnemonic}
              // wallet={wallet}
              walletKey={dbWallet.get()}
              // walletWords={dbWallet.get().words.split(' ')}
              // words={words}
              key={dbWallet.get().id}
            />
          ))}

        <div
          onClick={() => updateMnemonic()}
          className="cursor-pointer rounded p-1 flex flex-col items-center my-2"
        >
          <div
            className="rounded-full w-16 h-16 bg-gray-300
            flex items-center justify-center text-[32px]"
          >
            +
          </div>
          <div>New wallet</div>
        </div>
      </div>
    )
  )
}
