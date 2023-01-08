import { BlueButton } from './UI'
import Copier from './copier'
import { useDatabase } from '@/db'
import { deleteWallet } from '@/store/walletsListState'
import { useEffect, useState } from 'react'
import { useWallet } from '@/store/walletState'
import { useNavigate } from 'react-router-dom'

export function WalletGenerator() {
  const [isInfoOpened, setIsInfoOpened] = useState(false)
  const wallet = useWallet()
  const navigate = useNavigate()
  const key = wallet.key.get()

  const db = useDatabase()

  const [words, setWords] = useState(key?.words)

  useEffect(() => {
    console.log('set words ', key?.words || '')
    setWords(key?.words || '')
  }, [wallet.key])

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
              <Copier className="w-6 h-6 ml-2" text={key.words || ''} />
            </label>
            <textarea className="w-full h-24 outline-none" id="wordsInput" value={words} />
          </>
        )}

        {key.keyPair && key.seed && (
          <>
            <div>
              <div className="text-accent text-lg font-medium my-2 flex items-center">Seed:</div>
              <div className="flex">
                <div className="w-96 overflow-hidden text-ellipsis text-xs">{key.seed}</div>
                <Copier className="w-6 h-6 ml-2" text={key.seed || ''} />
              </div>
            </div>
            <div>
              <div className="text-accent text-lg font-medium my-2 flex items-center">
                Public key:
              </div>
              <div className="flex">
                <div className="w-96 overflow-hidden text-ellipsis text-xs">
                  {Buffer.from(key.keyPair?.publicKey || []).toString('hex')}
                </div>
                <Copier
                  className="w-6 h-6 ml-2"
                  text={Buffer.from(key.keyPair?.publicKey || []).toString('hex')}
                />
              </div>
            </div>
            <div>
              <div className="text-accent text-lg font-medium my-2 flex items-center">
                Secret key:
              </div>
              <div className="flex">
                <div className="w-96 overflow-hidden text-ellipsis text-xs">
                  {Buffer.from(key.keyPair?.secretKey || []).toString('hex')}
                </div>
                <Copier
                  className="w-6 h-6 ml-2"
                  text={Buffer.from(key.keyPair?.secretKey || []).toString('hex')}
                />
              </div>
            </div>
          </>
        )}
      </div>
      <BlueButton
        onClick={() => {
          deleteWallet(db, key)
          navigate('/')
        }}
      >
        Delete seed
      </BlueButton>
    </div>
  )
}
