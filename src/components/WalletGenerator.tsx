import { BlueButton } from './UI'
import Copier from './copier'
import { useDatabase } from '@/db'
import { deleteWallet } from '@/store/walletsListState'
import { useState } from 'react'
import { useWallet } from '@/store/walletState'
import { useNavigate } from 'react-router-dom'

export function WalletGenerator() {
  const [isInfoOpened, setIsInfoOpened] = useState(false)
  const wallet = useWallet()
  const navigate = useNavigate()
  const key = wallet.key.get({ noproxy: true })

  const db = useDatabase()

  const words = key?.words.get() || ''
  const seed = key?.seed.get() || ''

  if (!key) {
    return <></>
  }

  return !isInfoOpened ? (
    <>
      <BlueButton onClick={() => setIsInfoOpened(true)}>Open wallet key info</BlueButton>
    </>
  ) : (
    <div>
      <BlueButton onClick={() => setIsInfoOpened(false)}>Close wallet key info</BlueButton>
      <div className="my-2">
        {key.words && (
          <>
            <label
              htmlFor="wordsInput"
              className="text-accent text-lg font-medium my-2 flex items-center"
            >
              Words
              <Copier className="w-6 h-6 ml-2" text={words} />
            </label>
            <textarea className="w-full h-24 outline-none" id="wordsInput" defaultValue={words} />
          </>
        )}

        {key.keyPair && key.seed && (
          <>
            <div>
              <div className="text-accent text-lg font-medium my-2 flex items-center">Seed:</div>
              <div className="flex">
                <div className="w-96 overflow-hidden text-ellipsis text-xs">{key.get().seed}</div>
                <Copier className="w-6 h-6 ml-2" text={seed} />
              </div>
            </div>
            <div>
              <div className="text-accent text-lg font-medium my-2 flex items-center">
                Public key:
              </div>
              <div className="flex">
                <div className="w-96 overflow-hidden text-ellipsis text-xs">
                  {Buffer.from(key.keyPair?.get()?.publicKey || []).toString('hex')}
                </div>
                <Copier
                  className="w-6 h-6 ml-2"
                  text={Buffer.from(key.keyPair?.get()?.publicKey || []).toString('hex')}
                />
              </div>
            </div>
            <div>
              <div className="text-accent text-lg font-medium my-2 flex items-center">
                Secret key:
              </div>
              <div className="flex">
                <div className="w-96 overflow-hidden text-ellipsis text-xs">
                  {Buffer.from(key.keyPair?.get()?.secretKey || []).toString('hex')}
                </div>
                <Copier
                  className="w-6 h-6 ml-2"
                  text={Buffer.from(key.keyPair?.get()?.secretKey || []).toString('hex')}
                />
              </div>
            </div>
          </>
        )}
      </div>
      <BlueButton
        onClick={() => {
          deleteWallet(db, key.id.get())
          navigate('/')
        }}
      >
        Delete seed
      </BlueButton>
    </div>
  )
}
