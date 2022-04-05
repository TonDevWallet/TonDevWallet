import TonWeb from 'tonweb'
import { useEffect, useState } from 'preact/hooks'
import { generateMnemonic, mnemonicToKeyPair, validateMnemonic } from 'tonweb-mnemonic'
import { useAsync } from 'react-async-hook'

import Copier from './components/copier'

const provider = new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC')

export function App() {
  const [words, setWords] = useState<string[]>([])

  const generate = async () => {
    const mnemonic = await generateMnemonic()
    setWords(mnemonic)
  }

  useEffect(() => {
    if (words.length === 0) {
      generate()
    }
  }, [])

  const key = useAsync(async () => {
    const isValid = await validateMnemonic(words)
    if (!isValid) {
      return null
    }
    return mnemonicToKeyPair(words)
  }, [words])

  const wallets = useAsync(async () => {
    // eslint-disable-next-line new-cap
    const walletv3R2 = new TonWeb.Wallets.all.v3R2(provider, { publicKey: key.result?.publicKey })
    const v3R2Address = (await walletv3R2.getAddress()).toString(true, true, true)

    // eslint-disable-next-line new-cap
    const walletv4R2 = new TonWeb.Wallets.all.v4R2(provider, { publicKey: key.result?.publicKey })
    const v4R2Address = (await walletv4R2.getAddress()).toString(true, true, true)

    return [
      {
        type: 'v3R2',
        address: v3R2Address,
        balance: '0',
      },
      {
        type: 'v4R2',
        address: v4R2Address,
        balance: '0',
      },
    ]
  }, [key.result])

  const walletWithBalanes = useAsync(async () => {
    if (!wallets.result) {
      return []
    }

    // const result = []
    // for (const wallet of wallets.result) {
    //   const balance = await provider.getBalance(wallet.address)
    //   await delay(1000)

    //   result.push({ ...wallet, balance: TonWeb.utils.fromNano(balance) })
    // }

    return wallets.result
  }, [wallets.result])

  const walletsToShow = walletWithBalanes.result || wallets.result

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onWordsChange = (e: any) => {
    console.log('e', e)
    setWords(e.target.value.split(' '))
  }

  return (
    <div className="md:max-w-xl px-4 mx-auto flex flex-col mt-8">
      <h1 className="font-bold text-xl text-accent">TON Wallet Generator</h1>

      <div className="my-2">
        <label
          htmlFor="wordsInput"
          className="text-accent text-lg font-medium my-2 flex items-center"
        >
          Words
          <Copier className="w-6 h-6 ml-2" text={words.join(' ')} />
        </label>
        <div
          className="w-full h-24 outline-none"
          id="wordsInput"
          type="text"
          contentEditable
          onChange={onWordsChange}
        >
          {words.join(' ')}
        </div>
      </div>

      <button onClick={generate} className="bg-highlight rounded px-2 py-2 w-48 text-white">
        Generate new words
      </button>

      <div className="font-medium text-lg text-accent my-2">Wallets:</div>

      <div className="flex justify-start items-center">
        <div className="w-12">Type</div>
        <div>Address</div>
      </div>

      {walletsToShow?.map((wallet) => (
        <div className="my-2 flex justify-start items-center" key={wallet.address}>
          <div className="w-12">{wallet.type}</div>
          <div className="text-[8px] md:text-sm">{wallet.address}</div>

          <div className="ml-auto">
            <Copier text={wallet.address} />
          </div>
        </div>
      ))}
    </div>
  )
}
