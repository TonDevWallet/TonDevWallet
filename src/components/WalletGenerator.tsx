import { useEffect } from 'preact/hooks'
import { generateMnemonic, KeyPair, mnemonicToKeyPair, validateMnemonic } from 'tonweb-mnemonic'
import { IWallet } from '../types'
import { BlueButton } from './UI'
import Copier from './copier'

export function WalletGenerator({
  words,

  setWords,
  setWallet,
  setKeyPair,
}: {
  words: string[]

  setWords: (v: string[]) => void
  setWallet: (v: IWallet | undefined) => void
  setKeyPair: (v: KeyPair | undefined) => void
}) {
  const generate = async () => {
    const mnemonic = await generateMnemonic()
    const keyPair = await mnemonicToKeyPair(mnemonic)

    setWords(mnemonic)
    setKeyPair(keyPair)
    setWallet(undefined)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onWordsChange = async (e: any) => {
    const mnemonic = e.target.value.split(' ')

    if (await validateMnemonic(mnemonic)) {
      setKeyPair(await mnemonicToKeyPair(mnemonic))
    } else {
      setKeyPair(undefined)
    }

    setWords(mnemonic)
    setWallet(undefined)
  }

  useEffect(() => {
    if (words.length === 0) {
      generate()
    }
  }, [])

  return (
    <div>
      <div className="my-2">
        <form>
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
        </form>
      </div>

      <BlueButton onClick={generate}>Generate new words</BlueButton>
    </div>
  )
}
