import { BlueButton } from './ui/BlueButton'
import Copier from './copier'
import { useDatabase } from '@/db'
import { CreateNewKeyWallet, deleteWallet } from '@/store/walletsListState'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelectedKey } from '@/store/walletState'
import { WalletType } from '@/types'
import { openPasswordPopup, useDecryptWalletData, usePassword } from '@/store/passwordManager'
import { useSeed } from '@/hooks/useKeyPair'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faPlus } from '@fortawesome/free-solid-svg-icons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function WalletGenerator() {
  const [isInfoOpened, setIsInfoOpened] = useState(false)

  const selectedWallet = useSelectedKey()

  useEffect(() => {
    setIsInfoOpened(false)
  }, [selectedWallet?.id.get()])

  return (
    <>
      {!isInfoOpened ? (
        <div className="flex gap-2">
          <BlueButton className="mb-2" variant={'outline'} onClick={() => setIsInfoOpened(true)}>
            Show wallet key info
          </BlueButton>
          <AddWalletPopup />
        </div>
      ) : (
        <div>
          <div className="flex gap-2">
            <BlueButton className="mb-2" variant={'outline'} onClick={() => setIsInfoOpened(false)}>
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

  const { decryptedData, isLoading } = useDecryptWalletData(password, key?.encrypted.get())
  // const seed = useSeed(decryptedData.)

  const words = decryptedData?.mnemonic
  const seed = decryptedData?.seed
  const keyPair = useSeed(seed)

  if (!password) {
    return (
      <div>
        <BlueButton onClick={openPasswordPopup} variant={'outline'} className="mt-2">
          Unlock wallet
        </BlueButton>
      </div>
    )
  }

  if (!key) {
    return <></>
  }

  if (!password) {
    return <></>
  }

  return (
    <div className={'my-4'}>
      <div className="">
        {isLoading && (
          <div>
            <FontAwesomeIcon icon={faClock} /> Decrypting your wallet...
          </div>
        )}

        {words && (
          <>
            <label htmlFor="wordsInput" className="text-lg font-medium my-2 flex items-center">
              Words
              <Copier className="w-6 h-6 ml-2" text={words} />
            </label>
            <Textarea className="w-full h-24 outline-none" id="wordsInput" value={words} readOnly />
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
        variant={'outline'}
        onClick={() => {
          deleteWallet(db, key.id.get())
          navigate('/app')
        }}
      >
        Delete seed
      </BlueButton>
    </div>
  )
}

function AddWalletPopup() {
  const selectedKey = useSelectedKey()

  // const typeRef = useRef<HTMLSelectElement>(null)
  const subwalletIdRef = useRef<HTMLInputElement>(null)
  const [walletType, setWalletType] = useState('v4R2')

  const saveWallet = async (close: () => void) => {
    await CreateNewKeyWallet({
      type: walletType as WalletType,
      subwalletId: parseInt(subwalletIdRef.current?.value || '', 10),
      keyId: selectedKey?.id.get() || 0,
    })
    close()
  }

  return (
    <div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline">
            <FontAwesomeIcon icon={faPlus} className="mr-1" />
            Add Wallet
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wallet Settings</AlertDialogTitle>
            <AlertDialogDescription className={'flex flex-col gap-2'}>
              <div className="flex items-center gap-2">
                Wallet Type:
                <Select defaultValue={walletType} onValueChange={setWalletType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select wallet version" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="v4R2">v4R2</SelectItem>
                      <SelectItem value="v3R2">v3R2</SelectItem>
                      <SelectItem value="highload">Highload V2</SelectItem>
                      <SelectItem value="highload_v2r2">Highload V2R2</SelectItem>
                      <SelectItem value="highload_v3">Highload V3</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                SubwalletId: <Input type="number" ref={subwalletIdRef} defaultValue={698983191} />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => saveWallet(() => {})}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
