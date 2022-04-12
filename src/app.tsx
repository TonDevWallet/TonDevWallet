import TonWeb from 'tonweb'
import { useEffect, useState } from 'preact/hooks'
import { generateMnemonic, mnemonicToKeyPair, validateMnemonic } from 'tonweb-mnemonic'
import { useAsync } from 'react-async-hook'
import clipboard from 'clipboardy'

import Copier from './components/copier'

import CopySvg from './components/icons/copy'
import DoneSvg from './components/icons/done'

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
    const v3R2Address = await walletv3R2.getAddress()

    // eslint-disable-next-line new-cap
    const walletv4R2 = new TonWeb.Wallets.all.v4R2(provider, { publicKey: key.result?.publicKey })
    const v4R2Address = await walletv4R2.getAddress()

    return [
      {
        type: 'v4R2',
        address: v4R2Address,
        balance: '0',
      },
      {
        type: 'v3R2',
        address: v3R2Address,
        balance: '0',
      },
    ]
  }, [key.result])

  const walletsToShow = wallets.result

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onWordsChange = (e: any) => {
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
        <textarea
          className="w-full h-24 outline-none"
          id="wordsInput"
          type="text"
          onChange={onWordsChange}
          value={words.join(' ')}
        ></textarea>
      </div>

      <button onClick={generate} className="bg-highlight rounded px-2 py-2 w-48 text-white">
        Generate new words
      </button>

      <div className="font-medium text-lg text-accent my-2">Wallets:</div>

      {/* <div className="flex justify-start items-center">
        <div className="w-12">Type</div>
        <div>Address</div>
      </div> */}

      {walletsToShow?.map((wallet) => (
        <div className="my-2 flex flex-col border" key={wallet.address.toString(true, true, true)}>
          <div className="border-b px-1">Wallet {wallet.type}</div>

          <AddressRow text="Bouncable:" address={wallet.address.toString(true, true, true)} />
          <AddressRow text="UnBouncable:" address={wallet.address.toString(true, true, false)} />
          <AddressRow text="Raw:" address={wallet.address.toString(false)} />
        </div>
      ))}
    </div>
  )
}

function AddressRow({ address, text }: { address: string; text: string }) {
  const [copied, setCopied] = useState(false)

  const pressCopy = () => {
    clipboard.write(address)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 1000)
  }

  return (
    <div class="flex justify-start items-center py-2 cursor-pointer px-1" onClick={pressCopy}>
      <div className="">{text}</div>
      <div className="text-[12px]">{address}</div>

      <div className="ml-auto">
        <button className="w-6 h-6">{copied ? <DoneSvg /> : <CopySvg />}</button>
      </div>
    </div>
  )
}
