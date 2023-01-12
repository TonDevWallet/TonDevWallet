import { useLiteclient } from '@/store/liteClient'
import { addTonConnectSession } from '@/store/tonConnect'
import { useSelectedKey, useSelectedWallet } from '@/store/walletState'
import { CreateMessage, createTonProofMessage, SignatureCreate } from '@/utils/tonProof'
import { getWalletFromKey } from '@/utils/wallets'
// import { useWallet } from '@/store/walletState'
import { ConnectEventSuccess, CHAIN, ConnectRequest, TonProofItem } from '@tonconnect/protocol'
import { useRef } from 'react'
import { Cell, beginCell, storeStateInit, StateInit } from 'ton-core'
import { keyPairFromSeed } from 'ton-crypto'
import { LiteClient } from 'ton-lite-client'
import nacl from 'tweetnacl'
import { BlueButton } from '../UI'
import { fetch as tFetch } from '@tauri-apps/api/http'
import { sendTonConnectMessage } from '@/utils/tonConnect'

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

  const seed = selectedKey.seed.get() || ''
  const keyPair = keyPairFromSeed(Buffer.from(seed, 'hex'))

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
    const rString = parsed.searchParams.get('r')
    const r = rString ? (JSON.parse(rString) as ConnectRequest) : undefined

    if (!r) {
      return
    }

    const { data: metaInfo } = await tFetch<{
      iconUrl: string
      name: string
      url: string
    }>(r.manifestUrl)

    if (!metaInfo.url || !metaInfo.name) {
      return
    }

    const serviceUrl = new URL(metaInfo.url)
    const host = serviceUrl.host

    const proof = r?.items.find((i) => i.name === 'ton_proof') as TonProofItem

    const timestamp = Math.floor(Date.now())

    const domain = {
      LengthBytes: Buffer.from(host).length,
      Value: host,
    }

    const data: ConnectEventSuccess = {
      event: 'connect',
      payload: {
        device: {
          platform: 'windows',
          appName: 'ton-dev-wallet',
          appVersion: '0.1.0',
          maxProtocolVersion: 2,
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

    if (proof) {
      const signMessage = createTonProofMessage({
        address: wallet.address,
        domain,
        payload: proof.payload,
        stateInit: stateInit.toBoc().toString('base64'),
        timestamp,
      })
      const signature = SignatureCreate(keyPair.secretKey, await CreateMessage(signMessage))
      data.payload.items.push({
        name: 'ton_proof',
        proof: {
          timestamp,
          domain: {
            lengthBytes: domain.LengthBytes,
            value: domain.Value,
          },
          payload: proof.payload,
          signature: signature.toString('base64'),
        },
      })
    }

    await sendTonConnectMessage(data, sessionKeypair.secretKey, clientId)

    await addTonConnectSession({
      secretKey: Buffer.from(sessionKeypair.secretKey),
      userId: clientId,
      keyId: selectedKey.id.get() || 0,
      walletId: selectedWallet.id,
      iconUrl: metaInfo.iconUrl,
      name: metaInfo.name,
      url: metaInfo.url,
    })
  }

  return (
    <div>
      <BlueButton onClick={() => doBridgeAuth()}>DO auth</BlueButton>
      <input type="text" ref={nameRef} id="nameRef" className="border w-3/4 outline-none" />
    </div>
  )
}
