import { useWallet } from '@/store/walletState'
import { ITonWalletV4 } from '@/types'
import { Body, fetch as tFetch } from '@tauri-apps/api/http'
import {
  ConnectEventSuccess,
  CHAIN,
  SessionCrypto,
  hexToByteArray,
  Base64,
  SendTransactionRpcRequest,
} from '@tonconnect/protocol'
import { useRef } from 'react'
import { Cell, beginCell, storeStateInit, StateInit, internal } from 'ton-core'
import nacl from 'tweetnacl'
import { BlueButton } from '../UI'

export function TonConnect() {
  const nameRef = useRef<HTMLInputElement | null>(null)
  const wallet = useWallet()

  const selectedWallet = wallet.selectedWallet.get()
  let address: string
  let stateInit: Cell
  if (selectedWallet?.type === 'highload') {
    address = selectedWallet.address.toRawString()
    stateInit = beginCell()
      .store(storeStateInit(selectedWallet.wallet.stateInit as unknown as StateInit))
      .endCell()
  } else if (selectedWallet?.type === 'v3R2') {
    address = selectedWallet.address.toRawString()
    stateInit = beginCell()
      .store(storeStateInit(selectedWallet.wallet.init as unknown as StateInit))
      .endCell()
  } else if (selectedWallet?.type === 'v4R2') {
    address = selectedWallet.address.toRawString()
    stateInit = beginCell()
      .store(storeStateInit(selectedWallet.wallet.init as unknown as StateInit))
      .endCell()
  }

  const doBridgeAuth = async () => {
    const input = nameRef.current?.value || ''
    const parsed = new URL(input)
    console.log('parse', parsed, parsed.searchParams.get('id'))

    // protocol.SessionCrypto
    const sessionKeypair = nacl.box.keyPair()
    const clientId = parsed.searchParams.get('id') || '' // '230f1e4df32364888a5dbd92a410266fcb974b73e30ff3e546a654fc8ee2c953'
    const bridgeUrl = 'https://bridge.tonapi.io/bridge'
    const data: ConnectEventSuccess = {
      event: 'connect',
      payload: {
        device: {
          platform: 'windows',
          appName: 'ton-dev-wallet',
          appVersion: '0.1.0',
          maxProtocolVersion: 1,
          features: ['SendTransaction'],
        },
        items: [
          {
            name: 'ton_addr',
            address,
            network: CHAIN.MAINNET,
            walletStateInit: stateInit.toBoc().toString('base64'),
          },
        ],
      },
    }

    const url = new URL(`${bridgeUrl}/message`)
    url.searchParams.append('client_id', Buffer.from(sessionKeypair.publicKey).toString('hex'))
    url.searchParams.append('to', clientId)
    url.searchParams.append('ttl', '300')

    const session = new SessionCrypto({
      publicKey: Buffer.from(sessionKeypair.publicKey).toString('hex'),
      secretKey: Buffer.from(sessionKeypair.secretKey).toString('hex'),
    })

    const id = 0
    const message = session.encrypt(JSON.stringify({ ...data, id }), hexToByteArray(clientId))

    // this.bridge.send(encodedRequest, this.session.walletPublicKey).catch(reject)

    await fetch(url, {
      method: 'post',
      body: Base64.encode(message),
      // Base64.encode(message),
    })

    const sseUrl = new URL(`${bridgeUrl}/events`)
    sseUrl.searchParams.append('client_id', Buffer.from(sessionKeypair.publicKey).toString('hex'))
    sseUrl.searchParams.append('last_event_id', '0')
    // url.searchParams.append('to', clientId)
    // url.searchParams.append('ttl', '300')
    const sse = new EventSource(sseUrl)

    /*
     * This will listen only for events
     * similar to the following:
     *
     * event: notice
     * data: useful data
     * id: someid
     */
    sse.addEventListener('notice', (e) => {
      console.log('sse notice', e.data)
    })

    /*
     * Similarly, this will listen for events
     * with the field `event: update`
     */
    sse.addEventListener('update', (e) => {
      console.log('sse update', e.data)
    })

    /*
     * The event "message" is a special case, as it
     * will capture events without an event field
     * as well as events that have the specific type
     * `event: message` It will not trigger on any
     * other event type.
     */
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

      const w = selectedWallet as unknown as ITonWalletV4

      console.log(
        'messages, ',
        info.messages.map((m) =>
          internal({
            body: Cell.fromBase64(m.payload),
            to: m.address,
            value: BigInt(m.amount),
          })
        ),
        await w.wallet.getSeqno()
      )

      const transfer = w.wallet.createTransfer({
        seqno: await w.wallet.getSeqno(),
        secretKey: w.key.secretKey,
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
    })

    // protocol.
    // await fetch(`https://bridge.tonapi.io/bridge/message?client_id=${clientId}`, {
    //   method: 'POST',
    // })
  }

  return (
    <div>
      <BlueButton onClick={() => doBridgeAuth()}>DO auth</BlueButton>
      <input type="text" ref={nameRef} id="nameRef" className="border w-3/4 outline-none" />
    </div>
  )
}
