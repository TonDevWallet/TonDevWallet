import { useEffect, useState } from 'react'
import {
  generateMnemonic,
  KeyPair,
  mnemonicToKeyPair,
  validateMnemonic,
  mnemonicToSeed,
} from 'tonweb-mnemonic'
import { IWallet } from '../types'
import { BlueButton } from './UI'
import Copier from './copier'

export function WalletGenerator({
  words,
  keyPair,
  walletId,

  setWords,
  setWallet,
  setKeyPair,
  setWalletId,
}: {
  words: string[]
  keyPair?: KeyPair
  walletId: number

  setWords: (v: string[]) => void
  setWallet: (v: IWallet | undefined) => void
  setKeyPair: (v: KeyPair | undefined) => void
  setWalletId: (v: number) => void
}) {
  const [seed, setSeed] = useState<Uint8Array | undefined>(undefined)

  const generate = async () => {
    console.log('generate')
    const mnemonic = await generateMnemonic()
    const keyPair = await mnemonicToKeyPair(mnemonic)
    const sd = await mnemonicToSeed(mnemonic)

    setWords(mnemonic)
    setSeed(sd)
    setKeyPair(keyPair)
    setWallet(undefined)
  }

  console.log('wallet generator')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onWordsChange = async (e: any) => {
    console.log('on words change')
    try {
      const mnemonic = e.target.value.split(' ')

      if (await validateMnemonic(mnemonic)) {
        setKeyPair(await mnemonicToKeyPair(mnemonic))
        const ls = await mnemonicToSeed(mnemonic)
        setSeed(ls)
      } else {
        setKeyPair(undefined)
        setSeed(undefined)
      }

      setWords(mnemonic)
      setWallet(undefined)
    } catch (e) {
      console.log('onWordsChange error', e)
    }
  }

  useEffect(() => {
    console.log('effect', words)
    if (words.length === 0) {
      generate()
    }
  }, [])

  return (
    <div>
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
          onChange={onWordsChange}
          value={words.join(' ')}
        ></textarea>

        <div>
          <label
            htmlFor="walletIdInput"
            className="text-accent text-lg font-medium my-2 flex items-center"
          >
            WalletID
          </label>
          <input
            type="number"
            value={walletId}
            onChange={(e: any) => setWalletId(parseInt(e.target.value))}
          />
        </div>

        {keyPair && seed && (
          <>
            <div>
              <div className="text-accent text-lg font-medium my-2 flex items-center">Seed:</div>
              <div className="flex">
                <div className="w-96 overflow-hidden text-ellipsis text-xs">
                  {Buffer.from(seed).toString('hex')}
                </div>
                <Copier className="w-6 h-6 ml-2" text={Buffer.from(seed).toString('hex')} />
              </div>
            </div>
            <div>
              <div className="text-accent text-lg font-medium my-2 flex items-center">
                Public key:
              </div>
              <div className="flex">
                <div className="w-96 overflow-hidden text-ellipsis text-xs">
                  {Buffer.from(keyPair.publicKey).toString('hex')}
                </div>
                <Copier
                  className="w-6 h-6 ml-2"
                  text={Buffer.from(keyPair.publicKey).toString('hex')}
                />
              </div>
            </div>
            <div>
              <div className="text-accent text-lg font-medium my-2 flex items-center">
                Secret key:
              </div>
              <div className="flex">
                <div className="w-96 overflow-hidden text-ellipsis text-xs">
                  {Buffer.from(keyPair.secretKey).toString('hex')}
                </div>
                <Copier
                  className="w-6 h-6 ml-2"
                  text={Buffer.from(keyPair.secretKey).toString('hex')}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <BlueButton onClick={generate}>Generate new words</BlueButton>
    </div>
  )
}
