import {
  HighloadWalletV2,
  HighloadWalletV2R2,
} from '@/contracts/highload-wallet-v2/HighloadWalletV2'
import { WalletTransfer } from '@/contracts/utils/HighloadWalletTypes'
import { SignCell } from '@/contracts/utils/SignExternalMessage'
import { LiteClientState, useLiteclient } from '@/store/liteClient'
import { useSelectedKey, useSelectedWallet } from '@/store/walletState'
import {
  GetExternalMessageCell,
  ITonHighloadWalletV2,
  ITonHighloadWalletV2R2,
  ITonHighloadWalletV3,
  ITonMultisigWalletV2V4R2,
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
  Address,
  beginCell,
  Cell,
  external,
  internal,
  loadStateInit,
  OutActionSendMsg,
  SendMode,
  StateInit,
  storeMessage,
  toNano,
} from '@ton/core'

import { WalletContractV3R2, WalletContractV4 } from '@ton/ton'
import { KeyPair } from '@ton/crypto'
import { LiteClient } from 'ton-lite-client'
import { HighloadWalletV3 } from '@/contracts/highload-wallet-v3/HighloadWalletV3'
import { HighloadWalletV3CodeCell } from '@/contracts/highload-wallet-v3/HighloadWalletV3.source'
import { HighloadQueryId } from '@/contracts/highload-wallet-v3/HighloadQueryId'
import { Maybe } from '@ton/core/dist/utils/maybe'
import { Multisig } from '@/contracts/multisig-v2/Multisig'

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
  } else if (wallet.type === 'highload_v2r2') {
    const tonWallet = new HighloadWalletV2R2({
      publicKey: Buffer.from(key.public_key, 'base64'),
      subwalletId: wallet.subwallet_id,
      workchain: 0,
    })
    const result: ITonHighloadWalletV2R2 = {
      type: 'highload_v2r2',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromHighload(tonWallet),
      key: encryptedData,
      id: wallet.id,
      subwalletId: wallet.subwallet_id,
    }
    return result
  } else if (wallet.type === 'highload_v3') {
    const tonWallet = HighloadWalletV3.createFromConfig(
      {
        publicKey: Buffer.from(key.public_key, 'base64'),
        subwalletId: wallet.subwallet_id,
        timeout: 60,
      },
      HighloadWalletV3CodeCell,
      0
    )
    tonWallet.setSubwalletId(wallet.subwallet_id)
    const result: ITonHighloadWalletV3 = {
      type: 'highload_v3',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromHighloadV3(tonWallet),
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
  } else if (wallet.type === 'multisig_v2_v4r2') {
    if (!wallet.wallet_address) {
      throw new Error('Wallet address required for multisig')
    }
    const tonWallet = liteClient.open(
      WalletContractV4.create({
        workchain: 0,
        publicKey: Buffer.from(key.public_key, 'base64'),
        walletId: wallet.subwallet_id,
      })
    )
    const result: ITonMultisigWalletV2V4R2 = {
      type: 'multisig_v2_v4r2',
      address: Address.parse(wallet.wallet_address),
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromTonMultisigWallet(
        tonWallet,
        wallet.wallet_address as string
      ),
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

function getExternalMessageCellFromHighloadV3(wallet: HighloadWalletV3): GetExternalMessageCell {
  return async (keyPair: KeyPair, transfers: WalletTransfer[]) => {
    const secretWithPublic =
      keyPair.secretKey.length === 64
        ? keyPair.secretKey
        : Buffer.concat([keyPair.secretKey, keyPair.publicKey])

    const rndShift = getRandomInt(0, 8190)
    const rndBitNum = getRandomInt(0, 1022)

    const queryId = HighloadQueryId.fromShiftAndBitNumber(BigInt(rndShift), BigInt(rndBitNum))

    const sendMessages: OutActionSendMsg[] = transfers.map((t) => {
      let init: Maybe<StateInit>
      if (t.state) {
        init = loadStateInit(t.state.asSlice())
      }

      return {
        type: 'sendMsg',
        mode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        outMsg: internal({
          to: t.destination,
          value: t.amount,
          body: t.body,
          bounce: t.bounce,
          init,
        }),
      }
    })

    const lsDesyncVar = 20 // seconds
    const message = await wallet.getExternalMessage(secretWithPublic, {
      createdAt: Math.floor(Date.now() / 1000) - lsDesyncVar,
      queryId,
      message: wallet.packActions(sendMessages, 1000000000n, queryId),
      mode: 3,
      timeout: 60,
    })
    return message
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

function getExternalMessageCellFromTonMultisigWallet(
  wallet: OpenedContract<WalletContractV3R2 | WalletContractV4>,
  multisigAddress: string
): GetExternalMessageCell {
  return async (keyPair: KeyPair, transfers: WalletTransfer[]) => {
    if (keyPair.secretKey.length === 32) {
      keyPair.secretKey = Buffer.concat([
        Uint8Array.from(keyPair.secretKey),
        Uint8Array.from(keyPair.publicKey),
      ])
    }

    const actions = Multisig.packOrder(
      transfers.map((t) => {
        return {
          type: 'transfer',
          sendMode: SendMode.PAY_GAS_SEPARATELY,
          message: {
            info: {
              type: 'internal',
              ihrDisabled: false,
              bounce: true,
              bounced: false,
              dest: t.destination,
              value: {
                coins: t.amount,
              },
              ihrFee: 0n,
              forwardFee: 0n,
              createdLt: 0n,
              createdAt: 0,
            },
            body: t.body ?? beginCell().endCell(),
          },
        }
      })
    )
    const expireAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 // 1 month

    const liteClient = LiteClientState.liteClient.get() as LiteClient
    const multisigContract = liteClient.open(
      Multisig.createFromAddress(Address.parse(multisigAddress))
    )
    const multisigData = await multisigContract.getMultisigData()

    const isSigner = multisigData.signers.some((s) => s.equals(wallet.address))
    const myIndex = isSigner
      ? multisigData.signers.findIndex((s) => s.equals(wallet.address))
      : multisigData.proposers.findIndex((s) => s.equals(wallet.address))
    let orderId = multisigData.nextOrderSeqno
    if (orderId === -1n) {
      orderId = BigInt(Math.floor(Math.random() * 2 ** 52))
    }

    const message = Multisig.newOrderMessage(actions, expireAt, isSigner, myIndex, orderId, 0n)

    const transfer = wallet.createTransfer({
      seqno: await wallet.getSeqno(),
      secretKey: keyPair.secretKey,
      messages: [
        internal({
          body: message,
          to: Address.parse(multisigAddress),
          value: toNano('0.2'),
          bounce: true,
        }),
      ],

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

    wallet.getExternalMessageCell(keyPair, transfers).then((c) => {
      setCell(c)
    })
  }, [wallet?.id, transfers, liteClient, keyPair])

  return cell
}

const getRandom = (min: number, max: number) => {
  return Math.random() * (max - min) + min
}

export const getRandomInt = (min: number, max: number) => {
  return Math.round(getRandom(min, max))
}
