import { useLiteclient } from '@/store/liteClient'
import { updateSessionEventId, useTonConnectSessions } from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import { openLiteClient } from '@/utils/liteClientProvider'
import { Body, fetch as tFetch } from '@tauri-apps/api/http'
import {
  Base64,
  hexToByteArray,
  SendTransactionRpcRequest,
  SessionCrypto,
} from '@tonconnect/protocol'
import { useEffect, useState } from 'react'
import { WalletContractV4 } from 'ton'
import { Cell, internal } from 'ton-core'
import { keyPairFromSeed } from 'ton-crypto'
import { LiteClient } from 'ton-lite-client'
import nacl from 'tweetnacl'

export function TonConnectListener() {
  const sessions = useTonConnectSessions()
  const [listners, setListeners] = useState<EventSource[]>([])
  const liteClient = useLiteclient() as unknown as LiteClient
  const walletsList = useWalletListState()

  useEffect(() => {
    const bridgeUrl = 'https://bridge.tonapi.io/bridge'
    const listeners: EventSource[] = []

    // sessions.map
    for (const s of sessions.get()) {
      console.log('listen to s', s)
      const keyPair = nacl.box.keyPair.fromSecretKey(s.secretKey)
      const session = new SessionCrypto({
        publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
        secretKey: Buffer.from(keyPair.secretKey).toString('hex'),
      })

      const sseUrl = new URL(`${bridgeUrl}/events`)
      sseUrl.searchParams.append('client_id', Buffer.from(keyPair.publicKey).toString('hex'))
      sseUrl.searchParams.append('last_event_id', s.lastEventId.toString())
      // url.searchParams.append('to', clientId)
      // url.searchParams.append('ttl', '300')
      const sse = new EventSource(sseUrl)

      sse.addEventListener('message', async (e) => {
        console.log('sse message2', e.data)

        const bridgeIncomingMessage = JSON.parse(e.data)
        const walletMessage: SendTransactionRpcRequest = JSON.parse(
          session.decrypt(
            Base64.decode(bridgeIncomingMessage.message).toUint8Array(),
            hexToByteArray(bridgeIncomingMessage.from)
          )
        )
        console.log('wallet message', walletMessage)

        if (walletMessage.method !== 'sendTransaction') {
          return
        }

        const info = JSON.parse(walletMessage.params[0]) as {
          messages: {
            address: string
            amount: string
            payload: string // boc
          }[]
          valid_until: number // date now
        }

        const selectedWallet = walletsList.get().find((i) => i.id === s.walletId)

        if (!selectedWallet || !selectedWallet.seed) {
          console.log('walletsList', selectedWallet, walletsList.get(), s.walletId)
          throw new Error('no wallet')
        }

        const walletKeyPair = keyPairFromSeed(Buffer.from(selectedWallet.seed, 'hex'))

        // const w = selectedWallet as unknown as ITonWalletV4
        const w = openLiteClient(
          liteClient,
          WalletContractV4.create({ workchain: 0, publicKey: walletKeyPair.publicKey })
        )

        console.log(
          'messages, ',
          info.messages.map((m) =>
            internal({
              body: Cell.fromBase64(m.payload),
              to: m.address,
              value: BigInt(m.amount),
            })
          ),
          await w.getSeqno()
        )

        const transfer = w.createTransfer({
          seqno: await w.getSeqno(),
          secretKey: walletKeyPair.secretKey,
          messages: info.messages.map((m) =>
            internal({
              body: Cell.fromBase64(m.payload),
              to: m.address,
              value: BigInt(m.amount),
            })
          ),
          sendMode: 3,
        })
        console.log('message boc', transfer.toBoc().toString('base64'))
        try {
          const txInfo = await tFetch('https://tonapi.io/v1/send/estimateTx', {
            method: 'POST',
            body: Body.json({
              boc: transfer.toBoc().toString('base64'),
            }),
          })
          console.log('info ok', txInfo)
        } catch (e) {}
        console.log('send ok')

        console.log('update before', e)
        updateSessionEventId(s.id, parseInt(e.lastEventId))
      })

      // protocol.
      // await fetch(`https://bridge.tonapi.io/bridge/message?client_id=${clientId}`, {
      //   method: 'POST',
      // })
      listeners.push(sse)
    }

    setListeners(listeners)

    return () => {
      for (const listener of listeners) {
        listener.close()
      }
    }
  }, [liteClient, sessions])
  return (
    <>
      <div>Listeners: {listners.length}</div>
    </>
  )
}
