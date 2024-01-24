import { saveKeyFromData } from '@/store/walletsListState'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Copier from '../copier'
import { BlueButton } from '../ui/BlueButton'
import { KeyPair } from '@ton/crypto'
import { cn } from '@/utils/cn'
import { secretKeyToED25519 } from '@/utils/ed25519'

export function FromSeed() {
  const navigate = useNavigate()

  const [seed, setSeed] = useState('')
  const [keyPair, setParsedSeed] = useState<KeyPair | undefined>(undefined)
  const [name, setName] = useState('')

  const onWordsChange = async (e: any) => {
    try {
      const data = e.target.value
      setSeed(data)
      setParsedSeed(undefined)

      try {
        const parsed = secretKeyToED25519(Buffer.from(data, 'hex'))
        if (parsed) {
          setParsedSeed(parsed)
        }
      } catch (e) {}
    } catch (e) {
      console.log('onWordsChange error', e)
    }
  }

  const saveSeed = async () => {
    if (!name) {
      return
    }
    if (seed.length !== 64) {
      throw new Error('Seed must be 64 characters')
    }
    await saveKeyFromData(name || '', navigate, Buffer.from(seed, 'hex'))
  }

  return (
    <div>
      <div className="flex flex-col">
        <label htmlFor="seedInput">Seed</label>
        <input
          className="border w-3/4 outline-none rounded px-2 py-1"
          id="seedInput"
          onChange={onWordsChange}
          value={seed}
        />
        {/* <input type="text" id="mnemonicInput" className="border rounded p-2 w-96" /> */}
      </div>

      {keyPair && (
        <>
          <div>
            <div className="text-lg font-medium my-2 flex items-center">Seed:</div>
            <div className="flex">
              <div className="w-96 overflow-hidden text-ellipsis text-xs">{seed}</div>
              <Copier className="w-6 h-6 ml-2" text={seed || ''} />
            </div>
          </div>
          <div>
            <div className="text-lg font-medium my-2 flex items-center">Public key:</div>
            <div className="flex">
              <div className="w-96 overflow-hidden text-ellipsis text-xs">
                {Buffer.from(keyPair?.publicKey || []).toString('hex')}
              </div>
              <Copier
                className="w-6 h-6 ml-2"
                text={Buffer.from(keyPair?.publicKey || []).toString('hex')}
              />
            </div>
          </div>
          <div>
            <div className="text-lg font-medium my-2 flex items-center">Secret key:</div>
            <div className="flex">
              <div className="w-96 overflow-hidden text-ellipsis text-xs">
                {Buffer.from(keyPair?.secretKey || []).toString('hex')}
              </div>
              <Copier
                className="w-6 h-6 ml-2"
                text={Buffer.from(keyPair?.secretKey || []).toString('hex')}
              />
            </div>
          </div>

          <div className="py-4 flex flex-col">
            <label htmlFor="nameRef">Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              id="nameRef"
              className="border w-3/4 outline-none rounded px-2 py-1"
            />

            <BlueButton
              onClick={saveSeed}
              className={cn('mt-2', !name && 'opacity-50')}
              disabled={!name}
            >
              Save
            </BlueButton>
          </div>
        </>
      )}
    </div>
  )
}
