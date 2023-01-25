import { LiteClientState, useLiteclient } from '@/store/liteClient'
import { addTonConnectSession } from '@/store/tonConnect'
import { useSelectedKey, useSelectedWallet } from '@/store/walletState'
import { CreateMessage, createTonProofMessage, SignatureCreate } from '@/utils/tonProof'
import { getWalletFromKey } from '@/utils/wallets'
// import { useWallet } from '@/store/walletState'
import { ConnectEventSuccess, CHAIN, ConnectRequest, TonProofItem } from '@tonconnect/protocol'
import { useRef } from 'react'
import { Cell, beginCell, storeStateInit, StateInit } from 'ton-core'
import { KeyPair } from 'ton-crypto'
import { LiteClient } from 'ton-lite-client'
import nacl from 'tweetnacl'
import { BlueButton } from '../ui/BlueButton'
import { fetch as tFetch } from '@tauri-apps/api/http'
import { sendTonConnectMessage } from '@/utils/tonConnect'
import { IWallet } from '@/types'
import { Block } from '../ui/Block'

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

  const doBridgeAuth = async () => {
    if (!selectedWallet) {
      return
    }
    const input = nameRef.current?.value || ''
    const parsed = new URL(input)
    console.log('parse', parsed, parsed.searchParams.get('id'))

    const sessionKeypair = nacl.box.keyPair() as KeyPair
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

    if (!metaInfo.name) {
      console.log('No connect meta', metaInfo)
      return
    }

    let host = ''
    try {
      const serviceUrl = new URL(metaInfo.url)
      host = serviceUrl.host || ''
    } catch (e) {
      console.log('Service url error')
    }

    await sendTonConnectStartMessage(wallet, host, sessionKeypair, clientId, r)

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
    <Block className="flex flex-col gap-2">
      {/* <div className="flex"> */}
      <label htmlFor="tonconnectLink">Enter your Ton Connect link</label>
      <input
        type="text"
        ref={nameRef}
        id="tonconnectLink"
        autoComplete="off"
        className="border w-full outline-none rounded p-2"
      />
      <BlueButton onClick={() => doBridgeAuth()}>Connect</BlueButton>
      {/* </div> */}
    </Block>
  )
}

export async function sendTonConnectStartMessage(
  wallet: IWallet,
  host: string,
  sessionKeyPair: KeyPair,
  sessionClientId: string,
  connectRequest?: ConnectRequest
) {
  let stateInit: Cell
  if (wallet?.type === 'highload') {
    stateInit = beginCell()
      .store(storeStateInit(wallet.wallet.stateInit as unknown as StateInit))
      .endCell()
  } else if (wallet?.type === 'v3R2') {
    stateInit = beginCell()
      .store(storeStateInit(wallet.wallet.init as unknown as StateInit))
      .endCell()
  } else {
    // if (wallet?.type === 'v4R2') {
    stateInit = beginCell()
      .store(storeStateInit(wallet.wallet.init as unknown as StateInit))
      .endCell()
  }

  const walletKeyPair = wallet.key

  const proof = connectRequest?.items.find((i) => i.name === 'ton_proof') as TonProofItem
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
          address: wallet.address.toRawString(),
          network: LiteClientState.testnet.get() ? CHAIN.TESTNET : CHAIN.MAINNET,
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
    const signature = SignatureCreate(walletKeyPair.secretKey, await CreateMessage(signMessage))
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

  await sendTonConnectMessage(data, sessionKeyPair.secretKey, sessionClientId)
}
