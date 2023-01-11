import { useLiteclient } from '@/store/liteClient'
import { addTonConnectSession } from '@/store/tonConnect'
import { useSelectedKey, useSelectedWallet } from '@/store/walletState'
import { getWalletFromKey } from '@/utils/wallets'
// import { useWallet } from '@/store/walletState'
import {
  ConnectEventSuccess,
  CHAIN,
  SessionCrypto,
  hexToByteArray,
  Base64,
} from '@tonconnect/protocol'
import { useRef } from 'react'
import { Cell, beginCell, storeStateInit, StateInit } from 'ton-core'
import { LiteClient } from 'ton-lite-client'
import nacl from 'tweetnacl'
import { BlueButton } from '../UI'

export function TonConnect() {
  const nameRef = useRef<HTMLInputElement | null>(null)
  // const wallet = useWallet()
  const liteClient = useLiteclient() as unknown as LiteClient

  const selectedWallet = useSelectedWallet()
  const selectedKey = useSelectedKey()

  if (!selectedKey || !selectedWallet) {
    return <></>
  }

  const wallet = getWalletFromKey(liteClient, selectedKey, selectedWallet)

  if (!wallet) {
    return <></>
  }

  let address: string
  let stateInit: Cell
  if (wallet?.type === 'highload') {
    address = wallet.address.toRawString()
    stateInit = beginCell()
      .store(storeStateInit(wallet.wallet.stateInit as unknown as StateInit))
      .endCell()
  } else if (wallet?.type === 'v3R2') {
    address = wallet.address.toRawString()
    stateInit = beginCell()
      .store(storeStateInit(wallet.wallet.init as unknown as StateInit))
      .endCell()
  } else if (wallet?.type === 'v4R2') {
    address = wallet.address.toRawString()
    stateInit = beginCell()
      .store(storeStateInit(wallet.wallet.init as unknown as StateInit))
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
      keyId: selectedKey.id.get() || 0,
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
