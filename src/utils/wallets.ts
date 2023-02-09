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
import { State } from '@hookstate/core'
import { useEffect, useMemo, useState } from 'react'
import {
  beginCell,
  storeMessage,
  WalletContractV3R2,
  WalletContractV4,
  external,
  internal,
  Cell,
  loadStateInit,
  loadMessage,
} from 'ton'
import { KeyPair } from 'ton-crypto'
import { LiteClient } from 'ton-lite-client'
import { openLiteClient } from './liteClientProvider'
import { SendMessageResult } from '@ton-community/sandbox'
import { LiteClientBlockchainStorage } from './liteClientBlockchainStorage'
import { ManagedBlockchain } from './ManagedBlockchain'

export function getWalletFromKey(
  liteClient: LiteClient,
  key: State<Key>,
  wallet: SavedWallet
): IWallet | undefined {
  const encryptedData = key.encryptedData.get()
  if (!encryptedData) {
    return
  }

  if (wallet.type === 'highload') {
    const tonWallet = new HighloadWalletV2({
      publicKey: Buffer.from(key.public_key.get(), 'base64'),
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
    const tonWallet = openLiteClient(
      liteClient,
      WalletContractV3R2.create({
        workchain: 0,
        publicKey: Buffer.from(key.public_key.get(), 'base64'),
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
    const tonWallet = openLiteClient(
      liteClient,
      WalletContractV4.create({
        workchain: 0,
        publicKey: Buffer.from(key.public_key.get(), 'base64'),
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
    const wallet = getWalletFromKey(liteClient, selectedKey, selectedWallet)
    return wallet
  }, [liteClient, selectedKey, selectedWallet])
}

function getExternalMessageCellFromHighload(wallet: HighloadWalletV2): GetExternalMessageCell {
  return async (keyPair: KeyPair, transfers: WalletTransfer[]) => {
    const message = wallet.CreateTransferMessage(transfers)
    const signedBody = SignCell(keyPair.secretKey, message.body)
    message.body = signedBody
    const messageCell = beginCell().store(storeMessage(message)).endCell()

    return messageCell
  }
}

function getExternalMessageCellFromTonWallet(
  wallet: OpenedContract<WalletContractV3R2 | WalletContractV4>
): GetExternalMessageCell {
  return async (keyPair: KeyPair, transfers: WalletTransfer[]) => {
    const transfer = wallet.createTransfer({
      seqno: await wallet.getSeqno(),
      secretKey: keyPair.secretKey,
      messages: transfers.map((m) => {
        const msg = internal({
          body: m.body,
          to: m.destination,
          value: m.amount,
          bounce: m.bounce,
          // init: m.state,
        })

        if (m.state) {
          msg.init = loadStateInit(m.state.asSlice())
        }
        return msg
      }),
      sendMode: 3,
    })
    const ext = external({
      to: wallet.address,
      init: wallet.init,
      // init: neededInit ? { code: neededInit.code, data: neededInit.data } : null,
      body: transfer,
    })
    const messageCell = beginCell().store(storeMessage(ext)).endCell()
    // const message = wallet.CreateTransferMessage(transfers)
    // const signedBody = SignCell(keyPair.secretKey, message.body)
    // message.body = signedBody
    // const messageCell = beginCell().store(storeMessage(message)).endCell()

    return messageCell
  }
}

export function useWalletExternalMessageCell(
  wallet: IWallet | undefined,
  keyPair: KeyPair,
  transfers: WalletTransfer[]
) {
  const [cell, setCell] = useState<Cell | undefined>()
  const liteClient = useLiteclient()

  useEffect(() => {
    if (wallet) {
      wallet.getExternalMessageCell(keyPair, transfers).then(setCell)
    }
  }, [wallet?.id, transfers, liteClient])

  return cell
}

export function useTonapiTxInfo(cell: Cell | undefined) {
  const [response, setResponse] = useState<SendMessageResult | undefined>()
  const [progress, setProgress] = useState<{ total: number; done: number }>({ done: 0, total: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const liteClient = useLiteclient() as LiteClient

  useEffect(() => {
    if (!cell) {
      setResponse(undefined)
      return
    }

    let stopEmulator = () => {
      // do nothing
    }
    const startEmulator = async () => {
      try {
        setResponse(undefined)
        setProgress({ done: 0, total: 0 })
        setIsLoading(true)

        const onAddMessage = () => {
          setProgress((p) => ({ ...p, total: p.total + 1 }))
        }
        const onCompleteMessage = () => {
          setProgress((p) => ({ ...p, done: p.done + 1 }))
        }
        const storage = new LiteClientBlockchainStorage(liteClient)
        const blockchain = await ManagedBlockchain.create({
          storage,
        })
        const msg = loadMessage(cell.beginParse())
        const start = Date.now()
        const { result, emitter } = blockchain.sendMessageWithProgress(msg)

        let isStopped = false
        stopEmulator = () => {
          isStopped = true
          emitter.emit('stop')

          emitter.removeListener('add_message', onAddMessage)
          emitter.removeListener('complete_message', onCompleteMessage)
        }

        emitter.on('add_message', onAddMessage)
        emitter.on('complete_message', onCompleteMessage)
        const res = await result

        console.log('b res', res.events.length, Date.now() - start, isStopped)

        if (isStopped) {
          return
        }
        setResponse(res)
        setIsLoading(false)
      } catch (err) {
        console.log('b err', err)
        setIsLoading(false)
      }
    }

    startEmulator()

    return () => {
      console.log('unmount effect')
      stopEmulator()
    }
  }, [cell])

  return { response, progress, isLoading }
}
