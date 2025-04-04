import { useEffect, useMemo, useState } from 'react'

import { IWallet } from '@/types'
import { WalletGenerator } from '@/components/WalletGenerator'
import { WalletsTable } from '@/components/WalletsTable'

import { setWalletKey, useSelectedKey } from '@/store/walletState'
import { useLiteclient } from '@/store/liteClient'
import { LiteClient } from 'ton-lite-client'
import { useParams } from 'react-router-dom'
import { updateWalletName, useWalletListState } from '@/store/walletsListState'
import { getWalletFromKey } from '@/utils/wallets'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileEdit } from '@fortawesome/free-solid-svg-icons'
import { BlueButton } from '@/components/ui/BlueButton'
import { Input } from '../ui/input'

function WalletHeader(props: { name?: string; keyId: number }) {
  const [isEditing, setIsEditing] = useState(false)
  const [newName, setNewName] = useState('')
  return isEditing ? (
    <div>
      <h1 className="font-bold text-xl mt-2 mb-4">
        Wallet {props.name} <FontAwesomeIcon icon={faFileEdit} onClick={() => setIsEditing(true)} />
      </h1>
      <div className={'flex flex-col mt-1 mb-4 gap-2'}>
        <label htmlFor="newNameInput">New wallet name:</label>

        <Input
          id={'newNameInput'}
          type="text"
          className="border border-gray-300 rounded-md p-2"
          value={newName}
          onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
        />
        <BlueButton
          onClick={async () => {
            setIsEditing(false)
            await updateWalletName(newName, props.keyId)
          }}
        >
          Save
        </BlueButton>
      </div>
    </div>
  ) : (
    <h1 className="font-bold text-xl mt-2 mb-4">
      Wallet {props.name}{' '}
      <FontAwesomeIcon
        icon={faFileEdit}
        onClick={() => {
          setNewName(props.name || '')
          setIsEditing(true)
        }}
      />
    </h1>
  )
}

export function WalletPage() {
  const liteClient = useLiteclient() as unknown as LiteClient
  const urlParams = useParams()
  const walletsList = useWalletListState()

  useEffect(() => {
    const id = parseInt(urlParams.walletId || '')
    const selectedWallet = walletsList.get().find((i) => i.id === id)
    if (selectedWallet) {
      setWalletKey(selectedWallet.id).then()
    }
  }, [urlParams.walletId])

  const key = useSelectedKey()
  const walletsToShow = useMemo<IWallet[]>(() => {
    if (!key?.public_key) {
      return []
    }

    const wallets: IWallet[] =
      key.wallets.get()?.map((w) => {
        const newWallet = getWalletFromKey(liteClient, key.get(), w)
        if (!newWallet) {
          throw new Error('no wallet')
        }

        return newWallet
      }) || []

    return wallets
  }, [key, key?.wallets, liteClient])

  return (
    <div className="grid grid-cols-[1fr] gap-4 justify-center flex-col md:flex-row">
      <div className="md:max-w-xl min-w-0 w-full grow-0 flex flex-col">
        <WalletHeader name={key?.name.get()} keyId={key?.id.get() || 0} />
        <WalletGenerator />
      </div>

      <WalletsTable walletsToShow={walletsToShow} />
    </div>
  )
}
