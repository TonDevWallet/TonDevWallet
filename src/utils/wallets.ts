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
  ITonWalletV1R1,
  ITonWalletV1R2,
  ITonWalletV1R3,
  ITonWalletV2R1,
  ITonWalletV2R2,
  ITonWalletV3,
  ITonWalletV3R1,
  ITonWalletV4,
  ITonWalletV5,
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
  contractAddress,
  Dictionary,
  external,
  internal,
  loadStateInit,
  OutActionSendMsg,
  SendMode,
  StateInit,
  storeMessage,
  storeMessageRelaxed,
  toNano,
} from '@ton/core'

import {
  WalletContractV1R1,
  WalletContractV1R2,
  WalletContractV1R3,
  WalletContractV2R1,
  WalletContractV2R2,
  WalletContractV3R1,
  WalletContractV3R2,
  WalletContractV4,
} from '@ton/ton'
import { KeyPair, sign } from '@ton/crypto'
import { LiteClient } from 'ton-lite-client'
import { HighloadWalletV3 } from '@/contracts/highload-wallet-v3/HighloadWalletV3'
import { HighloadWalletV3CodeCell } from '@/contracts/highload-wallet-v3/HighloadWalletV3.source'
import { HighloadQueryId } from '@/contracts/highload-wallet-v3/HighloadQueryId'
import { Maybe } from '@ton/core/dist/utils/maybe'
import { Multisig } from '@/contracts/multisig-v2/Multisig'
import { Opcodes, WalletId, WalletV5, bufferToBigInt } from '@/contracts/w5/WalletV5R1'
import { WalletV5R1CodeCell } from '@/contracts/w5/WalletV5R1.source'
import { ActionSendMsg, packActionsList } from '@/contracts/w5/actions'
import { SignMessage } from './signer'

export function getWalletFromKey(
  liteClient: LiteClient | ImmutableObject<LiteClient>,
  key: ImmutableObject<Key>,
  wallet: SavedWallet
): IWallet | undefined {
  // debugger
  let encryptedData: any = {} // Default empty object instead of null

  try {
    // Handle both cases: empty string (view-only wallet) or valid encrypted data
    if (key.encrypted) {
      encryptedData = JSON.parse(key.encrypted)
    }
  } catch (e) {
    console.error('Error parsing encrypted data:', e)
    // Continue with empty object for view-only wallets
  }

  const workchainId = wallet.workchain_id ?? 0

  if (wallet.type === 'highload') {
    const tonWallet = new HighloadWalletV2({
      publicKey: Buffer.from(key.public_key, 'base64'),
      subwalletId: parseInt(wallet.subwallet_id),
      workchain: workchainId,
    })
    const result: ITonHighloadWalletV2 = {
      type: 'highload',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromHighload(tonWallet),
      key: encryptedData,
      id: wallet.id,
      subwalletId: parseInt(wallet.subwallet_id),
      name: wallet.name,
      workchainId,
    }
    return result
  } else if (wallet.type === 'highload_v2r2') {
    const tonWallet = new HighloadWalletV2R2({
      publicKey: Buffer.from(key.public_key, 'base64'),
      subwalletId: parseInt(wallet.subwallet_id),
      workchain: workchainId,
    })
    const result: ITonHighloadWalletV2R2 = {
      type: 'highload_v2r2',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromHighload(tonWallet),
      key: encryptedData,
      id: wallet.id,
      subwalletId: parseInt(wallet.subwallet_id),
      name: wallet.name,
      workchainId,
    }
    return result
  } else if (wallet.type === 'highload_v3') {
    const timeout = wallet.extra_data ? JSON.parse(wallet.extra_data)?.timeout : 600
    const tonWallet = HighloadWalletV3.createFromConfig(
      {
        publicKey: Buffer.from(key.public_key, 'base64'),
        subwalletId: parseInt(wallet.subwallet_id),
        timeout,
      },
      HighloadWalletV3CodeCell,
      workchainId
    )
    tonWallet.setSubwalletId(parseInt(wallet.subwallet_id))
    tonWallet.setTimeout(timeout)

    const result: ITonHighloadWalletV3 = {
      type: 'highload_v3',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromHighloadV3(tonWallet),
      key: encryptedData,
      id: wallet.id,
      subwalletId: parseInt(wallet.subwallet_id),
      timeout,
      name: wallet.name,
      workchainId,
    }
    return result
  } else if (wallet.type === 'v1R1') {
    const tonWallet = liteClient.open(
      WalletContractV1R1.create({
        workchain: workchainId,
        publicKey: Buffer.from(key.public_key, 'base64'),
      })
    )
    const result: ITonWalletV1R1 = {
      type: 'v1R1',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromTonWalletV1(tonWallet),
      key: encryptedData,
      id: wallet.id,
      name: wallet.name,
      workchainId,
    }
    return result
  } else if (wallet.type === 'v1R2') {
    const tonWallet = liteClient.open(
      WalletContractV1R2.create({
        workchain: workchainId,
        publicKey: Buffer.from(key.public_key, 'base64'),
      })
    )
    const result: ITonWalletV1R2 = {
      type: 'v1R2',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromTonWalletV1(tonWallet),
      key: encryptedData,
      id: wallet.id,
      name: wallet.name,
      workchainId,
    }
    return result
  } else if (wallet.type === 'v1R3') {
    const tonWallet = liteClient.open(
      WalletContractV1R3.create({
        workchain: workchainId,
        publicKey: Buffer.from(key.public_key, 'base64'),
      })
    )
    const result: ITonWalletV1R3 = {
      type: 'v1R3',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromTonWalletV1(tonWallet),
      key: encryptedData,
      id: wallet.id,
      name: wallet.name,
      workchainId,
    }
    return result
  } else if (wallet.type === 'v2R1') {
    const tonWallet = liteClient.open(
      WalletContractV2R1.create({
        workchain: workchainId,
        publicKey: Buffer.from(key.public_key, 'base64'),
      })
    )
    const result: ITonWalletV2R1 = {
      type: 'v2R1',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromTonWallet(tonWallet),
      key: encryptedData,
      id: wallet.id,
      name: wallet.name,
      workchainId,
    }
    return result
  } else if (wallet.type === 'v2R2') {
    const tonWallet = liteClient.open(
      WalletContractV2R2.create({
        workchain: workchainId,
        publicKey: Buffer.from(key.public_key, 'base64'),
      })
    )
    const result: ITonWalletV2R2 = {
      type: 'v2R2',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromTonWallet(tonWallet),
      key: encryptedData,
      id: wallet.id,
      name: wallet.name,
    }
    return result
  } else if (wallet.type === 'v3R1') {
    const tonWallet = liteClient.open(
      WalletContractV3R1.create({
        workchain: workchainId,
        publicKey: Buffer.from(key.public_key, 'base64'),
        walletId: parseInt(wallet.subwallet_id),
      })
    )
    const result: ITonWalletV3R1 = {
      type: 'v3R1',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromTonWallet(tonWallet),
      key: encryptedData,
      id: wallet.id,
      subwalletId: parseInt(wallet.subwallet_id),
      name: wallet.name,
      workchainId,
    }
    return result
  } else if (wallet.type === 'v3R2') {
    const tonWallet = liteClient.open(
      WalletContractV3R2.create({
        workchain: workchainId,
        publicKey: Buffer.from(key.public_key, 'base64'),
        walletId: parseInt(wallet.subwallet_id),
      })
    )
    const result: ITonWalletV3 = {
      type: 'v3R2',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromTonWallet(tonWallet),
      key: encryptedData,
      id: wallet.id,
      subwalletId: parseInt(wallet.subwallet_id),
      name: wallet.name,
      workchainId,
    }
    return result
  } else if (wallet.type === 'multisig_v2_v4r2') {
    let walletAddress = wallet.wallet_address
    if (!walletAddress) {
      console.log('Wallet address required for multisig')
      walletAddress = Address.parse(
        '0:0000000000000000000000000000000000000000000000000000000000000000'
      ).toString({ bounceable: true, urlSafe: true })
    }
    const tonWallet = liteClient.open(
      WalletContractV4.create({
        workchain: 0, // not available for this type
        publicKey: Buffer.from(key.public_key, 'base64'),
        walletId: parseInt(wallet.subwallet_id),
      })
    )
    const result: ITonMultisigWalletV2V4R2 = {
      type: 'multisig_v2_v4r2',
      address: Address.parse(walletAddress),
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromTonMultisigWallet(tonWallet, walletAddress),
      key: encryptedData,
      id: wallet.id,
      subwalletId: parseInt(wallet.subwallet_id),
      name: wallet.name,
      workchainId,
    }
    return result
  } else if (wallet.type === 'v4R2') {
    const tonWallet = liteClient.open(
      WalletContractV4.create({
        workchain: workchainId,
        publicKey: Buffer.from(key.public_key, 'base64'),
        walletId: parseInt(wallet.subwallet_id),
      })
    )
    const result: ITonWalletV4 = {
      type: 'v4R2',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromTonWalletV4R2(
        tonWallet,
        BigInt(wallet.subwallet_id),
        key as Key
      ), // getExternalMessageCellFromTonWallet(tonWallet),
      key: encryptedData,
      id: wallet.id,
      subwalletId: parseInt(wallet.subwallet_id),
      name: wallet.name,
      workchainId,
    }
    return result
  } else if (wallet.type === 'v5R1') {
    const tonWallet = liteClient.open(
      WalletV5.createFromConfig(
        {
          // workchain: 0,
          publicKey: Buffer.from(key.public_key, 'base64'),
          walletId: BigInt(wallet.subwallet_id),
          seqno: 0,
          extensions: Dictionary.empty(),
          signatureAllowed: true,
        },
        WalletV5R1CodeCell,
        workchainId
      )
    )
    const result: ITonWalletV5 = {
      type: 'v5R1',
      address: tonWallet.address,
      wallet: tonWallet,
      getExternalMessageCell: getExternalMessageCellFromTonWalletV5(
        tonWallet,
        BigInt(wallet.subwallet_id)
      ),
      key: encryptedData,
      id: wallet.id,
      subwalletId: BigInt(wallet.subwallet_id),
      name: wallet.name,
      workchainId,
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

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
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
      timeout: wallet.localTimeout(),
    })
    return message
  }
}

function getExternalMessageCellFromTonWalletV1(
  wallet: OpenedContract<WalletContractV1R1 | WalletContractV1R2 | WalletContractV1R3>
): GetExternalMessageCell {
  return async (keyPair: KeyPair, transfers: WalletTransfer[]) => {
    if (keyPair.secretKey.length === 32) {
      keyPair.secretKey = Buffer.concat([
        Uint8Array.from(keyPair.secretKey),
        Uint8Array.from(keyPair.publicKey),
      ])
    }
    if (transfers.length > 1) {
      throw new Error('V1 wallets can send only one message at a time')
    }
    const m = transfers[0]
    const msg = internal({
      body: m.body,
      to: m.destination,
      value: m.amount,
      bounce: m.bounce,
    })
    if (m.state) {
      msg.init = loadStateInit(m.state.asSlice())
    }
    const transfer = wallet.createTransfer({
      seqno: await wallet.getSeqno(),
      secretKey: keyPair.secretKey,
      message: msg,
      sendMode: m.mode ?? SendMode.IGNORE_ERRORS | SendMode.PAY_GAS_SEPARATELY,
    })
    const ext = external({
      to: wallet.address,
      init: wallet.init,
      body: transfer,
    })
    return beginCell().store(storeMessage(ext)).endCell()
  }
}

function getExternalMessageCellFromTonWallet(
  wallet: OpenedContract<
    | WalletContractV2R1
    | WalletContractV2R2
    | WalletContractV3R1
    | WalletContractV3R2
    | WalletContractV4
  >
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
      sendMode: transfers[0]?.mode ?? SendMode.IGNORE_ERRORS | SendMode.PAY_GAS_SEPARATELY,
    })
    const ext = external({
      to: wallet.address,
      init: wallet.init,
      body: transfer,
    })
    return beginCell().store(storeMessage(ext)).endCell()
  }
}

function getExternalMessageCellFromTonWalletV5(
  wallet: OpenedContract<WalletV5>,
  subwalletId: bigint
): GetExternalMessageCell {
  return async (keyPair: KeyPair, transfers: WalletTransfer[]) => {
    if (keyPair.secretKey.length === 32) {
      keyPair.secretKey = Buffer.concat([
        Uint8Array.from(keyPair.secretKey),
        Uint8Array.from(keyPair.publicKey),
      ])
    }

    const actions = packActionsList(
      transfers.map((m) => {
        const msg = internal({
          body: m.body,
          to: m.destination,
          value: m.amount,
          bounce: m.bounce,
          extracurrency: m.extraCurrency,
        })

        if (m.state) {
          msg.init = loadStateInit(m.state.asSlice())
        }
        return new ActionSendMsg(m.mode, msg)
      })
    )

    let seqno
    try {
      seqno = await wallet.getSeqno()
    } catch (e) {}
    let walletId = WalletId.deserialize(subwalletId)
    try {
      walletId = await wallet.getWalletId()
    } catch (e) {}
    const transfer = createBodyV5(keyPair, seqno, subwalletId, actions)

    console.log(
      'init',
      wallet.init,
      'seqno',
      seqno,
      'subwallet',
      subwalletId,
      walletId,
      wallet.address.toString(),
      'emulated address',
      contractAddress(0, wallet.init as any).toString()
    )

    const ext = external({
      to: wallet.address,
      init: wallet.init,
      body: transfer,
    })
    return beginCell().store(storeMessage(ext)).endCell()
  }
}

function getExternalMessageCellFromTonWalletV4R2(
  wallet: OpenedContract<WalletContractV4>,
  subwalletId: bigint,
  key: Key
) {
  return async (keyPair: KeyPair, transfers: WalletTransfer[]) => {
    if (keyPair.secretKey.length === 32) {
      keyPair.secretKey = Buffer.concat([
        Uint8Array.from(keyPair.secretKey),
        Uint8Array.from(keyPair.publicKey),
      ])
    }
    // Check number of messages
    // if (args.messages.length > 4) {
    //   throw Error('Maximum number of messages in a single transfer is 4')
    // }
    const signingMessage = beginCell().storeUint(subwalletId, 32)
    const seqno = await wallet.getSeqno()
    if (seqno === 0) {
      for (let i = 0; i < 32; i++) {
        signingMessage.storeBit(1)
      }
    } else {
      signingMessage.storeUint(Math.floor(Date.now() / 1e3) + 60, 32) // Default timeout: 60 seconds
    }
    signingMessage.storeUint(seqno, 32)
    signingMessage.storeUint(0, 8) // Simple order
    for (const m of transfers) {
      signingMessage.storeUint(3, 8) // mode
      const msg = internal({
        body: m.body,
        to: m.destination,
        value: m.amount,
        bounce: m.bounce,
        extracurrency: m.extraCurrency,
      })
      signingMessage.storeRef(beginCell().store(storeMessageRelaxed(msg)))
    }
    const signature = await SignMessage(keyPair.secretKey, signingMessage.endCell().hash(), key)
    const signedBody = beginCell()
      .storeBuffer(Buffer.from(signature))
      .storeBuilder(signingMessage)
      .endCell()

    const ext = external({
      to: wallet.address,
      init: wallet.init,
      body: signedBody,
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
      console.log('set external message cell', transfers)
      setCell(c)
    })
  }, [wallet?.id, transfers, liteClient, keyPair])

  return cell
}

function createBodyV5(keyPair: KeyPair, seqno: number, walletId: bigint, actionsList: Cell) {
  const expireAt = Math.floor(Date.now() / 1000) + 60
  const payload = beginCell()
    .storeUint(Opcodes.auth_signed, 32)
    .storeUint(walletId, 32)
    .storeUint(expireAt, 32)
    .storeUint(seqno, 32) // seqno
    .storeSlice(actionsList.beginParse())
    .endCell()

  const signature = sign(payload.hash(), keyPair.secretKey)
  // seqno++
  return beginCell()
    .storeSlice(payload.beginParse())
    .storeUint(bufferToBigInt(signature), 512)
    .endCell()
}
