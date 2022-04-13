import TonWeb from 'tonweb'

import { useEffect, useMemo, useState } from 'preact/hooks'
import { generateMnemonic, mnemonicToKeyPair, validateMnemonic } from 'tonweb-mnemonic'
import { useAsync } from 'react-async-hook'

import Copier from './components/copier'

import Wallet from './components/wallet'
import { IWallet } from './types'
import { getProvider } from './utils'
import { AddressRow } from './components/AddressRow'

// const provider = new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC')

export function App() {
  const [init, setInit] = useState(false)
  const [words, setWords] = useState<string[]>([])
  const [wallet, setWallet] = useState<IWallet | undefined>(undefined)
  const [testnet, setTestnet] = useState(true)
  const [apiKey, setApiKey] = useState<string>('')

  const provider = useMemo(() => getProvider(apiKey, testnet), [apiKey, testnet])

  const generate = async () => {
    const mnemonic = await generateMnemonic()
    setWords(mnemonic)
    setWallet(undefined)
  }

  // On mount load nfts and config if exists
  useEffect(() => {
    setTimeout(() => setInit(true), 128)

    if (window.localStorage) {
      const localTestnet = window.localStorage.getItem('tonwallgen_testnet')
      const localApikey = window.localStorage.getItem('tonwallgen_apikey')

      if (localTestnet) {
        setTestnet(localTestnet === 'true')
      }

      if (localApikey) {
        setApiKey(localApikey)
      }
    }
  }, [])

  // Set testnet and api to localstorage on change
  useEffect(() => {
    if (!init) {
      return
    }

    if (window.localStorage) {
      window.localStorage.setItem('tonwallgen_testnet', testnet.toString())
      window.localStorage.setItem('tonwallgen_apikey', apiKey)
    }
  }, [apiKey, testnet])

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
    if (!key.result) {
      return []
    }

    // eslint-disable-next-line new-cap
    const walletv3R1 = new TonWeb.Wallets.all.v3R1(provider, { publicKey: key.result.publicKey })
    const v3R1Address = await walletv3R1.getAddress()

    // eslint-disable-next-line new-cap
    const walletv3R2 = new TonWeb.Wallets.all.v3R2(provider, { publicKey: key.result.publicKey })
    const v3R2Address = await walletv3R2.getAddress()

    // eslint-disable-next-line new-cap
    const walletv4R2 = new TonWeb.Wallets.all.v4R2(provider, { publicKey: key.result.publicKey })
    const v4R2Address = await walletv4R2.getAddress()

    return [
      {
        type: 'v4R2',
        address: v4R2Address,
        balance: '0',
        wallet: walletv4R2,
        key: key.result,
      },
      {
        type: 'v3R2',
        address: v3R2Address,
        balance: '0',
        wallet: walletv3R2,
        key: key.result,
      },
      {
        type: 'v3R1',
        address: v3R1Address,
        balance: '0',
        wallet: walletv3R1,
        key: key.result,
      },
    ]
  }, [key.result])

  const walletsToShow = wallets.result

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onWordsChange = (e: any) => {
    setWords(e.target.value.split(' '))
    setWallet(undefined)
  }

  return (
    <div className="flex justify-center flex-col md:flex-row">
      <div className="md:max-w-xl w-full px-4 flex flex-col mt-8">
        <h1 className="font-bold text-xl text-accent">TON Wallet</h1>

        <div className="flex my-2 items-center">
          <div>
            <label htmlFor="testnetCheckbox">Testnet: </label>
            <input
              type="checkbox"
              id="testnetCheckbox"
              checked={testnet}
              onChange={() => setTestnet(!testnet)}
            />
          </div>

          <div className="ml-2">
            <label htmlFor="apiKeyInput">ApiKey: </label>
            <input
              type="text"
              id="apiKeyInput"
              className="border rounded px-2"
              value={apiKey}
              onChange={(e: any) => setApiKey(e.target.value)}
            />
          </div>
        </div>

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

        {walletsToShow?.map((wallet) => (
          <div
            className="my-2 flex flex-col border"
            key={wallet.address.toString(true, true, true)}
          >
            <div class="flex justify-between border-b px-1">
              <div className="">
                Wallet {wallet.type}
                <a
                  href={getScanLink(wallet.address.toString(true, true, true), testnet)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2"
                >
                  Link
                </a>
              </div>

              <div className="cursor-pointer" onClick={() => setWallet(wallet)}>
                Use this wallet
              </div>
            </div>

            <div className="px-2 my-2">
              <AddressRow text="Bouncable:" address={wallet.address.toString(true, true, true)} />
              <AddressRow
                text="UnBouncable:"
                address={wallet.address.toString(true, true, false)}
              />
              <AddressRow text="Raw:" address={wallet.address.toString(false)} />
            </div>
          </div>
        ))}
      </div>
      <div className="md:max-w-xl w-full px-4 flex flex-col mt-16">
        <Wallet wallet={wallet} testnet={testnet} apiKey={apiKey} />
      </div>
    </div>
  )
}

function getScanLink(address: string, testnet: boolean): string {
  return `https://${testnet ? 'testnet.' : ''}tonscan.org/address/${address}`
}
