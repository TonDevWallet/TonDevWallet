import { addTonConnectSession } from '@/store/tonConnect'
import { useWallet } from '@/store/walletState'
import { WalletType } from '@/types'
import {
  ConnectEventSuccess,
  CHAIN,
  SessionCrypto,
  hexToByteArray,
  Base64,
} from '@tonconnect/protocol'
import { useRef } from 'react'
import { Cell, beginCell, storeStateInit, StateInit } from 'ton-core'
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
    if (!selectedWallet) {
      return
    }
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

    await addTonConnectSession({
      secretKey: Buffer.from(sessionKeypair.secretKey),
      userId: clientId,
      keyId: wallet.key.get({ noproxy: true })?.id.get() || 0,
      walletId: selectedWallet.id,
      // walletType: selectedWallet.type as unknown as WalletType,
      // subwalletId: selectedWallet.subwalletId,
    })
  }

  return (
    <div>
      <BlueButton onClick={() => doBridgeAuth()}>DO auth</BlueButton>
      <input type="text" ref={nameRef} id="nameRef" className="border w-3/4 outline-none" />
    </div>
  )
}
