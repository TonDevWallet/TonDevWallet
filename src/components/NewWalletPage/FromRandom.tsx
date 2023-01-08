import { useDatabase } from '@/db'
import { saveWallet } from '@/store/walletsListState'
import { setWalletKey } from '@/store/walletState'
import { Key } from '@/types/Key'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mnemonicValidate, mnemonicToSeed, keyPairFromSeed, mnemonicNew } from 'ton-crypto'
import Copier from '../copier'
import { BlueButton } from '../UI'

export function FromRandom() {
  const navigate = useNavigate()
  const db = useDatabase()

  const nameRef = useRef<HTMLInputElement | null>(null)
  const [words, setWords] = useState('')
  const [mnemonicKey, setMnemonicKey] = useState<Key>({
    id: 0,
    name: '',
    seed: undefined,
    wallet_id: 0,
    words: '', // target.value,
    keyPair: undefined,
  })

  const onWordsChange = async (value: string) => {
    try {
      setWords(value)
      const mnemonic = value.split(' ')

      if (await mnemonicValidate(mnemonic)) {
        const ls = (await mnemonicToSeed(mnemonic, 'TON default seed')).subarray(0, 32)

        setMnemonicKey({
          id: 0,
          name: '',
          seed: Buffer.from(ls).toString('hex'),
          wallet_id: 0,
          words: mnemonic.join(' '),
          keyPair: keyPairFromSeed(ls),
        })
        // setSelectedWallet(null)
      } else {
        setMnemonicKey({
          id: 0,
          name: '',
          seed: undefined,
          wallet_id: 0,
          words: mnemonic.join(' '), // target.value,
          keyPair: undefined,
        })
        // setSelectedWallet(null)
      }
    } catch (e) {
      console.log('onWordsChange error', e)
    }
  }

  return (
    <div>
      <div className="flex flex-col">
        <BlueButton
          onClick={async () => {
            const mnemonic = await mnemonicNew()
            onWordsChange(mnemonic.join(' '))
          }}
        >
          Generate mnemonic
        </BlueButton>
      </div>

      {mnemonicKey.keyPair && mnemonicKey.seed && (
        <>
          <div className="text-accent text-lg font-medium my-2 flex items-center">Mnemonic:</div>
          <div>
            <textarea
              className="w-3/4 h-24 outline-none border p-1"
              id="mnemonicInput"
              value={words}
            />
            <div className="text-accent text-lg font-medium my-2 flex items-center">Seed:</div>
            <div className="flex">
              <div className="w-96 overflow-hidden text-ellipsis text-xs">{mnemonicKey.seed}</div>
              <Copier className="w-6 h-6 ml-2" text={mnemonicKey.seed || ''} />
            </div>
          </div>
          <div>
            <div className="text-accent text-lg font-medium my-2 flex items-center">
              Public key:
            </div>
            <div className="flex">
              <div className="w-96 overflow-hidden text-ellipsis text-xs">
                {Buffer.from(mnemonicKey.keyPair?.publicKey || []).toString('hex')}
              </div>
              <Copier
                className="w-6 h-6 ml-2"
                text={Buffer.from(mnemonicKey.keyPair?.publicKey || []).toString('hex')}
              />
            </div>
          </div>
          <div>
            <div className="text-accent text-lg font-medium my-2 flex items-center">
              Secret key:
            </div>
            <div className="flex">
              <div className="w-96 overflow-hidden text-ellipsis text-xs">
                {Buffer.from(mnemonicKey.keyPair?.secretKey || []).toString('hex')}
              </div>
              <Copier
                className="w-6 h-6 ml-2"
                text={Buffer.from(mnemonicKey.keyPair?.secretKey || []).toString('hex')}
              />
            </div>
          </div>

          <div className="py-4 flex flex-col">
            <label htmlFor="nameRef">Name:</label>
            <input type="text" ref={nameRef} id="nameRef" className="border w-3/4 outline-none" />

            <BlueButton
              onClick={async () => {
                const newWallet = await saveWallet(db, mnemonicKey, nameRef.current?.value || '')
                setWalletKey(newWallet)
                navigate(`/wallets/${newWallet?.id}`)
              }}
              className="mt-2"
            >
              Save
            </BlueButton>
          </div>
        </>
      )}
    </div>
  )
}
