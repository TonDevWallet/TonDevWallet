import { useSeed } from '@/hooks/useKeyPair'
import { saveKeyFromData } from '@/store/walletsListState'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mnemonicValidate, mnemonicToSeed } from '@ton/crypto'
import Copier from '../copier'
import { cn } from '@/utils/cn'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

export function FromMnemonic() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [words, setWords] = useState('')
  const [seed, setSeed] = useState<Buffer | undefined>()

  const onWordsChange = async (e: any) => {
    try {
      setWords(e.target.value)
      const mnemonic = e.target.value.split(' ')

      if (await mnemonicValidate(mnemonic)) {
        const ls = (await mnemonicToSeed(mnemonic, 'TON default seed')).subarray(0, 32)
        setSeed(ls)
      }
    } catch (e) {
      console.log('onWordsChange error', e)
    }
  }

  const walletKeyPair = useSeed(seed)

  const saveSeed = async () => {
    if (!seed || seed.length !== 32) {
      throw new Error('Seed must be 64 characters')
    }

    await saveKeyFromData(name || '', navigate, seed, words)
  }

  return (
    <div>
      <div className="flex flex-col">
        <label htmlFor="mnemonicInput">Mnemonic</label>
        <Textarea
          className="w-3/4 h-24 outline-none border p-1"
          id="mnemonicInput"
          onChange={onWordsChange}
          value={words}
          spellCheck={false}
          autoFocus
        />
        {/* <input type="text" id="mnemonicInput" className="border rounded p-2 w-96" /> */}
      </div>

      {seed && (
        <>
          <div>
            <div className="text-lg font-medium my-2 flex items-center">Seed:</div>
            <div className="flex">
              <div className="w-100 overflow-hidden text-ellipsis text-xs">
                {seed.toString('hex')}
              </div>
              <Copier className="w-6 h-6 ml-2" text={seed.toString('hex') || ''} />
            </div>
          </div>
          <div>
            <div className="text-lg font-medium my-2 flex items-center">Public key:</div>
            <div className="flex">
              <div className="w-100 overflow-hidden text-ellipsis text-xs">
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
              <div className="w-100 overflow-hidden text-ellipsis text-xs">
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
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              id="nameRef"
              className="border w-3/4 outline-none rounded px-2 py-1"
              autoFocus
            />

            <Button
              onClick={saveSeed}
              className={cn('mt-2 w-24', !name && 'opacity-50')}
              disabled={!name}
            >
              Save
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
