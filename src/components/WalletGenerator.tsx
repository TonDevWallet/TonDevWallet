import { BlueButton } from './ui/BlueButton'
import Copier from './copier'
import { useDatabase } from '@/db'
import { CreateNewKeyWallet, deleteWallet } from '@/store/walletsListState'
import { useEffect, useRef, useState, MouseEvent } from 'react'
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
import { Address } from '@ton/core'

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
  const subwalletIdRef = useRef<HTMLInputElement>(null)
  const [walletType, setWalletType] = useState<WalletType>('v5R1')
  const [walletAddress, setWalletAddress] = useState('')
  const [highloadV3Timeout, setHighloadV3Timeout] = useState(600)
  const [walletName, setWalletName] = useState('')
  const [workchainId, setWorkchainId] = useState('0')
  const changeWalletType = (type: string) => {
    setWalletType(type as WalletType)
    if (type === 'highload_v3') {
      setHighloadV3Timeout(600)
    }
  }

  const changeWorkchainId = (wc: string) => {
    setWorkchainId(wc)
    // Change to relevant ID if the default value is used
    if (wc === '-1' && subwalletIdRef.current?.value === '698983191') {
      subwalletIdRef.current.value = '698983190'
    }
    if (wc === '0' && subwalletIdRef.current?.value === '698983190') {
      subwalletIdRef.current.value = '698983191'
    }
  }

  const saveWallet = async (e: MouseEvent) => {
    let saveWalletAddress: string | null = null
    try {
      if (walletAddress) {
        const parsed = Address.parse(walletAddress)
        saveWalletAddress = parsed.toString()
      }
    } catch (err) {
      if (walletType === 'multisig_v2_v4r2') {
        e.preventDefault()
        throw err
      }
    }

    const extraData: Record<string, any> = {}
    if (walletType === 'highload_v3') {
      if (highloadV3Timeout < 60) {
        e.preventDefault()
        throw new Error('Timeout must be greater than 60')
      }
      extraData.timeout = highloadV3Timeout
    }

    const defaultName = walletType + (workchainId === '-1' ? '-MC' : '')

    await CreateNewKeyWallet({
      type: walletType as WalletType,
      subwalletId: BigInt(subwalletIdRef.current?.value || ''),
      keyId: selectedKey?.id.get() || 0,
      walletAddress: saveWalletAddress,
      extraData: JSON.stringify(extraData),
      name: walletName || defaultName,
      workchainId: parseInt(workchainId ?? '0'),
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
                Wallet Name:
                <Input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                Wallet Type:
                <Select defaultValue={walletType} onValueChange={changeWalletType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select wallet version" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="v5R1">W5</SelectItem>
                      <SelectItem value="v4R2">v4R2</SelectItem>
                      <SelectItem value="v3R2">v3R2</SelectItem>
                      <SelectItem value="highload">Highload V2</SelectItem>
                      <SelectItem value="highload_v2r2">Highload V2R2</SelectItem>
                      <SelectItem value="highload_v3">Highload V3</SelectItem>
                      <SelectItem value="multisig_v2_v4r2">MultisigV2 + V4R2</SelectItem>
                      <SelectItem value="v3R1">v3R1</SelectItem>
                      <SelectItem value="v2R2">v2R2</SelectItem>
                      <SelectItem value="v2R1">v2R1</SelectItem>
                      <SelectItem value="v1R3">v1R3</SelectItem>
                      <SelectItem value="v1R2">v1R2</SelectItem>
                      <SelectItem value="v1R1">v1R1</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {!walletType.startsWith('v1') && !walletType.startsWith('v2') && (
                <div className="flex items-center gap-2">
                  SubwalletId:{' '}
                  <Input
                    type="number"
                    ref={subwalletIdRef}
                    defaultValue={workchainId === '-1' ? 698983190 : 698983191}
                  />
                </div>
              )}

              {walletType !== 'multisig_v2_v4r2' && (
                <div className="flex items-center gap-2">
                  Workchain ID:
                  <Select defaultValue={workchainId} onValueChange={changeWorkchainId}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select workchain ID" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="0">Basechain (0)</SelectItem>
                        <SelectItem value="-1">Masterchain (-1)</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {walletType === 'multisig_v2_v4r2' && (
                <div className="flex items-center gap-2">
                  Address:{' '}
                  <Input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                  />
                </div>
              )}

              {walletType === 'highload_v3' && (
                <div className="flex items-center gap-2">
                  Timeout:{' '}
                  <Input
                    type="number"
                    value={highloadV3Timeout}
                    onChange={(e) => setHighloadV3Timeout(parseInt(e.target.value))}
                  />
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => saveWallet(e)}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
