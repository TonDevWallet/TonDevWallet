import { KeyPair, mnemonicToKeyPair, validateMnemonic, mnemonicToSeed } from 'tonweb-mnemonic'
import { IWallet } from '../types'
import { BlueButton } from './UI'
import Copier from './copier'
import { useDatabase } from '@/db'
import { updateWalletsList } from '@/store/walletsListState'
import Popup from 'reactjs-popup'
import { useRef, useState } from 'react'

export function WalletGenerator({
  words,
  keyPair,
  walletId,
  seed,

  setWords,
  setWallet,
  setKeyPair,
  setWalletId,
  setSeed,
}: {
  words: string[]
  keyPair?: KeyPair
  walletId: number
  seed: Uint8Array | undefined

  setWords: (v: string[]) => void
  setWallet: (v: IWallet | undefined) => void
  setKeyPair: (v: KeyPair | undefined) => void
  setWalletId: (v: number) => void
  setSeed: (s: Uint8Array | undefined) => void
}) {
  const [isInfoOpened, setIsInfoOpened] = useState(false)
  const [open, setOpen] = useState(false)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const close = () => setOpen(false)

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

  const db = useDatabase()
  const saveWallet = async (walletName: string) => {
    if (!seed) {
      return
    }

    await db.execute(`INSERT INTO keys(words,seed,wallet_id,name) VALUES($1,$2,$3,$4)`, [
      words.join(' '),
      Buffer.from(seed).toString('hex'),
      walletId,
      walletName,
    ])
    console.log('save wallet')
    updateWalletsList()
  }
  const deleteWallet = async () => {
    await db.execute(`DELETE FROM keys WHERE words = $1`, [words.join(' ')])
    updateWalletsList()
  }

  return !isInfoOpened ? (
    <div onClick={() => setIsInfoOpened(true)}>Open wallet key info</div>
  ) : (
    <div>
      <div onClick={() => setIsInfoOpened(false)}>Close wallet key info</div>
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
      {/* <BlueButton onClick={generate}>Generate new words</BlueButton> */}
      <BlueButton
        onClick={() => {
          console.log('open popup')
          setOpen(true)
        }}
      >
        Save seed
      </BlueButton>
      <BlueButton onClick={deleteWallet}>Delete seed</BlueButton>

      <Popup onClose={() => setOpen(false)} open={open} closeOnDocumentClick modal>
        <div className="p-4">
          <BlueButton
            onClick={() => {
              saveWallet(nameRef.current?.value || '')
              close()
            }}
            // disabled={!nameRef.current?.value}
          >
            Save
          </BlueButton>
          <input type="text" ref={nameRef} className="border" />
        </div>
      </Popup>
    </div>
  )
}
