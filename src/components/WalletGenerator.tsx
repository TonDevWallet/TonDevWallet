import { BlueButton } from './ui/BlueButton'
import Copier from './copier'
import { useDatabase } from '@/db'
import { CreateNewKeyWallet, deleteWallet } from '@/store/walletsListState'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelectedKey } from '@/store/walletState'
import { WalletType } from '@/types'
import { ReactPopup } from './Popup'
import { useDecryptWalletData, usePassword } from '@/store/passwordManager'
import { useSeed } from '@/hooks/useKeyPair'

export function WalletGenerator() {
  const [isInfoOpened, setIsInfoOpened] = useState(false)

  return (
    <>
      {!isInfoOpened ? (
        <div className="flex gap-2">
          <BlueButton className="mb-2" onClick={() => setIsInfoOpened(true)}>
            Show wallet key info
          </BlueButton>
          <AddWalletPopup />
        </div>
      ) : (
        <div>
          <div className="flex gap-2">
            <BlueButton className="mb-2" onClick={() => setIsInfoOpened(false)}>
              Close wallet key info
            </BlueButton>
            <AddWalletPopup />
          </div>
          <OpenedWalletInfo />
        </div>
      )}
    </>
  )
}

export function OpenedWalletInfo() {
  const navigate = useNavigate()
  const passwordState = usePassword()

  const key = useSelectedKey()
  const db = useDatabase()
  const password = passwordState.password.get()

  const decryptedData = useDecryptWalletData(password, key?.encrypted.get())
  // const seed = useSeed(decryptedData.)

  const words = decryptedData?.mnemonic
  const seed = decryptedData?.seed
  const keyPair = useSeed(seed)

  if (!key) {
    return <></>
  }

  if (!password) {
    return <></>
  }

  return (
    <div>
      <div className="my-2">
        {words && (
          <>
            <label htmlFor="wordsInput" className="text-lg font-medium my-2 flex items-center">
              Words
              <Copier className="w-6 h-6 ml-2" text={words} />
            </label>
            <textarea className="w-full h-24 outline-none" id="wordsInput" value={words} readOnly />
          </>
        )}

        {seed && (
          <>
            <div>
              <div className="text-lg font-medium my-2 flex items-center">Seed:</div>
              <div className="flex">
                <div className="w-96 overflow-hidden text-ellipsis text-xs">
                  {seed.toString('hex')}
                </div>
                <Copier className="w-6 h-6 ml-2" text={seed.toString('hex')} />
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

function AddWalletPopup() {
  const selectedKey = useSelectedKey()

  const typeRef = useRef<HTMLSelectElement>(null)
  const subwalletIdRef = useRef<HTMLInputElement>(null)

  const saveWallet = async (close: () => void) => {
    await CreateNewKeyWallet({
      type: typeRef.current?.value as WalletType,
      subwalletId: parseInt(subwalletIdRef.current?.value || '', 10),
      keyId: selectedKey?.id.get() || 0,
    })
    close()
  }

  return (
    <div>
      <ReactPopup trigger={<BlueButton>Add Wallet</BlueButton>} modal closeOnDocumentClick={true}>
        {(close: () => void) => {
          return (
            <div className="p-2 flex flex-col gap-2">
              <div className="">
                Wallet Type:
                <select ref={typeRef}>
                  <option value="v4R2">v4R2</option>
                  <option value="v3R2">v3R2</option>
                  <option value="highload">highload</option>
                </select>
              </div>
              <div className="">
                SubwalletId: <input type="number" ref={subwalletIdRef} defaultValue={698983191} />
              </div>

              <BlueButton onClick={() => saveWallet(close)}>Save</BlueButton>
            </div>
          )
        }}
      </ReactPopup>
    </div>
  )
}
