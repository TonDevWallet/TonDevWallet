import { useDatabase } from '@/db'
import { useSeed } from '@/hooks/useKeyPair'
import { getPasswordInteractive, encryptWalletData } from '@/store/passwordManager'
import { saveKeyAndWallets } from '@/store/walletsListState'
import { Key } from '@/types/Key'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mnemonicValidate, mnemonicToSeed, mnemonicNew, keyPairFromSeed } from 'ton-crypto'
import Copier from '../copier'
import { BlueButton } from '../ui/BlueButton'

export function FromRandom() {
  const navigate = useNavigate()
  const db = useDatabase()

  const nameRef = useRef<HTMLInputElement | null>(null)
  const [words, setWords] = useState('')
  const [seed, setSeed] = useState<Buffer | undefined>()

  const generateNewMnemonic = async () => {
    const mnemonic = await mnemonicNew()
    onWordsChange(mnemonic.join(' '))
  }

  const onWordsChange = async (value: string) => {
    try {
      setWords(value)
      setSeed(undefined)
      const mnemonic = value.split(' ')

      if (await mnemonicValidate(mnemonic)) {
        const ls = (await mnemonicToSeed(mnemonic, 'TON default seed')).subarray(0, 32)
        setSeed(ls)
      }
    } catch (e) {
      console.log('onWordsChange error', e)
    }
  }

  useEffect(() => {
    if (words === '') {
      generateNewMnemonic()
    }
  }, [])

  const walletKeyPair = useSeed(seed)

  const saveSeed = async () => {
    if (!seed || seed.length !== 32) {
      throw new Error('Seed must be 64 characters')
    }
    const password = await getPasswordInteractive()
    const encrypted = await encryptWalletData(password, {
      mnemonic: words,
      seed,
    })
    const keyPair = await keyPairFromSeed(seed)
    const key: Key = {
      id: 0,
      name: '',
      encrypted,
      public_key: keyPair.publicKey.toString('base64'),
    }
    saveKeyAndWallets(db, key, nameRef.current?.value || '', navigate)
  }

  return (
    <div>
      <div className="flex flex-col">
        <BlueButton onClick={generateNewMnemonic}>Generate mnemonic</BlueButton>
      </div>

      {seed && (
        <>
          <div className="text-lg font-medium my-2 flex items-center">Mnemonic:</div>
          <div>
            <textarea
              className="w-3/4 h-24 outline-none border p-1"
              id="mnemonicInput"
              value={words}
              readOnly
            />
            <div className="text-lg font-medium my-2 flex items-center">Seed:</div>
            <div className="flex">
              <div className="w-96 overflow-hidden text-ellipsis text-xs">
                {seed.toString('hex')}
              </div>
              <Copier className="w-6 h-6 ml-2" text={seed.toString('hex') || ''} />
            </div>
          </div>
          <div>
            <div className="text-lg font-medium my-2 flex items-center">Public key:</div>
            <div className="flex">
              <div className="w-96 overflow-hidden text-ellipsis text-xs">
                {Buffer.from(walletKeyPair?.publicKey || []).toString('hex')}
              </div>
              <Copier
                className="w-6 h-6 ml-2"
                text={Buffer.from(walletKeyPair?.publicKey || []).toString('hex')}
              />
            </div>
          </div>
          <div>
            <div className="text-lg font-medium my-2 flex items-center">Secret key:</div>
            <div className="flex">
              <div className="w-96 overflow-hidden text-ellipsis text-xs">
                {Buffer.from(walletKeyPair?.secretKey || []).toString('hex')}
              </div>
              <Copier
                className="w-6 h-6 ml-2"
                text={Buffer.from(walletKeyPair?.secretKey || []).toString('hex')}
              />
            </div>
          </div>

          <div className="py-4 flex flex-col">
            <label htmlFor="nameRef">Name:</label>
            <input
              type="text"
              ref={nameRef}
              id="nameRef"
              autoComplete="off"
              className="border w-3/4 outline-none"
            />

            <BlueButton onClick={saveSeed} className="mt-2">
              Save
            </BlueButton>
          </div>
        </>
      )}
    </div>
  )
}
