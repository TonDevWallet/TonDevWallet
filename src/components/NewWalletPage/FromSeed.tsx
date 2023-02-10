import { useSeed } from '@/hooks/useKeyPair'
import { saveKeyFromData } from '@/store/walletsListState'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Copier from '../copier'
import { BlueButton } from '../ui/BlueButton'

export function FromSeed() {
  const navigate = useNavigate()

  const nameRef = useRef<HTMLInputElement | null>(null)
  const [seed, setSeed] = useState('')

  const onWordsChange = async (e: any) => {
    try {
      setSeed(e.target.value)
      // const mnemonic = e.target.value.split(' ')
      const data = e.target.value
      if (data.length !== 64) {
        return
      }
    } catch (e) {
      console.log('onWordsChange error', e)
    }
  }

  const saveSeed = async () => {
    if (seed.length !== 64) {
      throw new Error('Seed must be 64 characters')
    }
    await saveKeyFromData(nameRef.current?.value || '', navigate, Buffer.from(seed, 'hex'))
  }

  const keyPair = useSeed(seed)

  return (
    <div>
      <div className="flex flex-col">
        <label htmlFor="seedInput">Seed</label>
        <input
          className="w-3/4 outline-none border p-1"
          id="seedInput"
          onChange={onWordsChange}
          value={seed}
        />
        {/* <input type="text" id="mnemonicInput" className="border rounded p-2 w-96" /> */}
      </div>

      {seed && (
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
            <input type="text" ref={nameRef} id="nameRef" className="border w-3/4 outline-none" />

            <BlueButton onClick={saveSeed} className="mt-2">
              Save
            </BlueButton>
          </div>
        </>
      )}
    </div>
  )
}
