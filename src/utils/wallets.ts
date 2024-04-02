import { HighloadWalletV2 } from '@/contracts/highload-wallet-v2/HighloadWalletV2'
import { WalletTransfer } from '@/contracts/utils/HighloadWalletTypes'
import { SignCell } from '@/contracts/utils/SignExternalMessage'
import { useLiteclient } from '@/store/liteClient'
import { useSelectedKey, useSelectedWallet } from '@/store/walletState'
import {
  GetExternalMessageCell,
  ITonHighloadWalletV2,
  ITonWalletV3,
  ITonWalletV4,
  IWallet,
  OpenedContract,
  SavedWallet,
} from '@/types'
import { Key } from '@/types/Key'
import { ImmutableObject } from '@hookstate/core'
import { useEffect, useMemo, useState } from 'react'
import {
  beginCell,
  Cell,
  external,
  internal,
  loadStateInit,
  SendMode,
  storeMessage,
} from '@ton/core'

import { WalletContractV3R2, WalletContractV4 } from '@ton/ton'
import { KeyPair } from '@ton/crypto'
import { LiteClient } from 'ton-lite-client'

export function getWalletFromKey(
  liteClient: LiteClient | ImmutableObject<LiteClient>,
  key: ImmutableObject<Key>,
  wallet: SavedWallet
): IWallet | undefined {
  const encryptedData = JSON.parse(key.encrypted)
  if (!encryptedData) {
    return
  }

  if (wallet.type === 'highload') {
    const tonWallet = new HighloadWalletV2({
      publicKey: Buffer.from(key.public_key, 'base64'),
      subwalletId: wallet.subwallet_id,
      workchain: 0,
    })
    const result: ITonHighloadWalletV2 = {
      type: 'highload',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromHighload(tonWallet),
      key: encryptedData,
      id: wallet.id,
      subwalletId: wallet.subwallet_id,
    }
    return result
  } else if (wallet.type === 'v3R2') {
    const tonWallet = liteClient.open(
      WalletContractV3R2.create({
        workchain: 0,
        publicKey: Buffer.from(key.public_key, 'base64'),
        walletId: wallet.subwallet_id,
      })
    )
    const result: ITonWalletV3 = {
      type: 'v3R2',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromTonWallet(tonWallet),
      key: encryptedData,
      id: wallet.id,
      subwalletId: wallet.subwallet_id,
    }
    return result
  } else {
    const tonWallet = liteClient.open(
      WalletContractV4.create({
        workchain: 0,
        publicKey: Buffer.from(key.public_key, 'base64'),
        walletId: wallet.subwallet_id,
      })
    )
    const result: ITonWalletV4 = {
      type: 'v4R2',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromTonWallet(tonWallet),
      key: encryptedData,
      id: wallet.id,
      subwalletId: wallet.subwallet_id,
    }
    return result
  }
}

export function useSelectedTonWallet() {
  const liteClient = useLiteclient() as unknown as LiteClient
  const selectedKey = useSelectedKey()
  const selectedWallet = useSelectedWallet()

  return useMemo(() => {
    if (!selectedKey || !selectedWallet) {
      return
    }
    return getWalletFromKey(liteClient, selectedKey.get(), selectedWallet)
  }, [liteClient, selectedKey, selectedWallet])
}

function getExternalMessageCellFromHighload(wallet: HighloadWalletV2): GetExternalMessageCell {
  return async (keyPair: KeyPair, transfers: WalletTransfer[]) => {
    const message = wallet.CreateTransferMessage(transfers)

    const secretWithPublic =
      keyPair.secretKey.length === 64
        ? keyPair.secretKey
        : Buffer.concat([keyPair.secretKey, keyPair.publicKey])

    message.body = SignCell(secretWithPublic, message.body)
    return beginCell().store(storeMessage(message)).endCell()
  }
}

function getExternalMessageCellFromTonWallet(
  wallet: OpenedContract<WalletContractV3R2 | WalletContractV4>
): GetExternalMessageCell {
  return async (keyPair: KeyPair, transfers: WalletTransfer[]) => {
    if (keyPair.secretKey.length === 32) {
      keyPair.secretKey = Buffer.concat([
        Uint8Array.from(keyPair.secretKey),
        Uint8Array.from(keyPair.publicKey),
      ])
    }
    const transfer = wallet.createTransfer({
      seqno: await wallet.getSeqno(),
      secretKey: keyPair.secretKey,
      messages: transfers.map((m) => {
        const msg = internal({
          body: m.body,
          to: m.destination,
          value: m.amount,
          bounce: m.bounce,
        })

        if (m.state) {
          msg.init = loadStateInit(m.state.asSlice())
        }
        return msg
      }),
      sendMode: SendMode.IGNORE_ERRORS | SendMode.PAY_GAS_SEPARATELY,
    })
    const ext = external({
      to: wallet.address,
      init: wallet.init,
      body: transfer,
    })
    return beginCell().store(storeMessage(ext)).endCell()
  }
}

export function useWalletExternalMessageCell(
  wallet: IWallet | undefined,
  keyPair: KeyPair | undefined,
  transfers: WalletTransfer[]
) {
  const [cell, setCell] = useState<Cell | undefined>()
  const liteClient = useLiteclient()

  useEffect(() => {
    if (!keyPair || !wallet) {
      setCell(undefined)
      return
    }

    wallet.getExternalMessageCell(keyPair, transfers).then(setCell)
  }, [wallet?.id, transfers, liteClient, keyPair])

  return cell
}
