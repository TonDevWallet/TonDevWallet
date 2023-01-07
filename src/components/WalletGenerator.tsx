import { BlueButton } from './UI'
import Copier from './copier'
import { useDatabase } from '@/db'
import { deleteWallet, saveWallet } from '@/store/walletsListState'
import Popup from 'reactjs-popup'
import { useEffect, useRef, useState } from 'react'
import { setSelectedWallet, setWalletKey, useWallet } from '@/store/walletState'
import { keyPairFromSeed, mnemonicToSeed, mnemonicValidate } from 'ton-crypto'

export function WalletGenerator() {
  const [isInfoOpened, setIsInfoOpened] = useState(false)
  const [open, setOpen] = useState(false)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const close = () => setOpen(false)
  const wallet = useWallet()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onWordsChange = async (e: any) => {
    const target = e.target as HTMLTextAreaElement
    try {
      const mnemonic = e.target.value.split(' ')

      if (await mnemonicValidate(mnemonic)) {
        const ls = (await mnemonicToSeed(mnemonic, 'TON default seed')).subarray(0, 32)

        setWalletKey({
          id: 0,
          name: '',
          seed: Buffer.from(ls).toString('hex'),
          wallet_id: wallet.key.get()?.wallet_id || 0,
          words: mnemonic.join(' '),
          keyPair: keyPairFromSeed(ls),
        })
        setSelectedWallet(null)
      } else {
        setWalletKey({
          id: 0,
          name: '',
          seed: undefined,
          wallet_id: wallet.key.get()?.wallet_id || 0,
          words: mnemonic.join(' '), // target.value,
          keyPair: undefined,
        })
        setSelectedWallet(null)
      }
    } catch (e) {
      console.log('onWordsChange error', e)
    }
  }

  const db = useDatabase()

  // const words = useMemo(() => wallet.key.get()?.words || '', [wallet.key])

  const [words, setWords] = useState(wallet.key.get()?.words)

  useEffect(() => {
    console.log('set words ', wallet.key.get()?.words || '')
    setWords(wallet.key.get()?.words || '')
    //   console.log('words effect', words)
  }, [wallet.key])

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
          <Copier className="w-6 h-6 ml-2" text={wallet.key.get()?.words || ''} />
        </label>
        <textarea
          className="w-full h-24 outline-none"
          id="wordsInput"
          onChange={onWordsChange}
          value={words}
        />

        <div>
          <label
            htmlFor="walletIdInput"
            className="text-accent text-lg font-medium my-2 flex items-center"
          >
            WalletID
          </label>
          {/* <input
            type="number"
            value={walletId}
            onChange={(e: any) => setWalletId(parseInt(e.target.value))}
          /> */}
        </div>

        {wallet.key.get()?.keyPair && wallet.key.get()?.seed && (
          <>
            <div>
              <div className="text-accent text-lg font-medium my-2 flex items-center">Seed:</div>
              <div className="flex">
                <div className="w-96 overflow-hidden text-ellipsis text-xs">
                  {wallet.key.get()?.seed}
                </div>
                <Copier className="w-6 h-6 ml-2" text={wallet.key.get()?.seed || ''} />
              </div>
            </div>
            <div>
              <div className="text-accent text-lg font-medium my-2 flex items-center">
                Public key:
              </div>
              <div className="flex">
                <div className="w-96 overflow-hidden text-ellipsis text-xs">
                  {Buffer.from(wallet.key.get()?.keyPair?.publicKey || []).toString('hex')}
                </div>
                <Copier
                  className="w-6 h-6 ml-2"
                  text={Buffer.from(wallet.key.get()?.keyPair?.publicKey || []).toString('hex')}
                />
              </div>
            </div>
            <div>
              <div className="text-accent text-lg font-medium my-2 flex items-center">
                Secret key:
              </div>
              <div className="flex">
                <div className="w-96 overflow-hidden text-ellipsis text-xs">
                  {Buffer.from(wallet.key.get()?.keyPair?.secretKey || []).toString('hex')}
                </div>
                <Copier
                  className="w-6 h-6 ml-2"
                  text={Buffer.from(wallet.key.get()?.keyPair?.secretKey || []).toString('hex')}
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
      <BlueButton onClick={() => deleteWallet(db, wallet.key.get()!)}>Delete seed</BlueButton>

      <Popup onClose={() => setOpen(false)} open={open} closeOnDocumentClick modal>
        <div className="p-4">
          <BlueButton
            onClick={() => {
              saveWallet(db, wallet.key.get()!, nameRef.current?.value || '')
              close()
            }}
          >
            Save
          </BlueButton>
          <input type="text" ref={nameRef} className="border" />
        </div>
      </Popup>
    </div>
  )
}
