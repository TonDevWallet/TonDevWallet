import { LiteClientState, useLiteclient } from '@/store/liteClient'
import { addTonConnectSession } from '@/store/tonConnect'
import { useSelectedKey, useSelectedWallet } from '@/store/walletState'
import { CreateMessage, createTonProofMessage, SignatureCreate } from '@/utils/tonProof'
import { getWalletFromKey } from '@/utils/wallets'
// import { useWallet } from '@/store/walletState'
import { ConnectEventSuccess, CHAIN, ConnectRequest, TonProofItem } from '@tonconnect/protocol'
import { useCallback, useState } from 'react'
import { Cell, beginCell, storeStateInit, StateInit } from '@ton/core'
import { KeyPair } from '@ton/crypto'
import { LiteClient } from 'ton-lite-client'
import { BlueButton } from '../ui/BlueButton'
import { fetch as tFetch } from '@tauri-apps/api/http'
import { sendTonConnectMessage } from '@/utils/tonConnect'
import { IWallet } from '@/types'
import { Block } from '../ui/Block'
import { invoke } from '@tauri-apps/api'
import clsx from 'clsx'
import { appWindow } from '@tauri-apps/api/window'
import {
  DecryptedWalletData,
  getPasswordInteractive,
  useDecryptWalletData,
  usePassword,
} from '@/store/passwordManager'
import { delay } from '@/utils'
import { randomX25519, secretKeyToED25519 } from '@/utils/ed25519'

export function TonConnect() {
  const [connectLink, setConnectLink] = useState('')
  const [isDetecting, setIsDetecting] = useState(false)
  // const wallet = useWallet()
  const liteClient = useLiteclient() as unknown as LiteClient

  const selectedWallet = useSelectedWallet()
  const selectedKey = useSelectedKey()

  const passwrodState = usePassword()
  const decryptedData = useDecryptWalletData(
    passwrodState.password.get(),
    selectedKey?.encrypted.get()
  )

  const detect = async () => {
    try {
      setIsDetecting(true)
      const code = await getQrcodeFromScreen()

      if (code) {
        console.log('Found QR code', code)
        setConnectLink(code)
      }
    } finally {
      setIsDetecting(false)
    }
  }

  if (!selectedKey || !selectedWallet) {
    return <></>
  }

  const wallet = getWalletFromKey(liteClient, selectedKey.get(), selectedWallet)

  if (!wallet) {
    return <></>
  }

  const doBridgeAuth = useCallback(async () => {
    if (!selectedWallet) {
      return
    }

    const password = await getPasswordInteractive()
    if (!password) {
      return
    }

    const input = connectLink
    const parsed = new URL(input)
    console.log('parse', parsed, parsed.searchParams.get('id'))

    const sessionKeypair = randomX25519() as KeyPair
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
      console.log('Service url error', metaInfo)
    }

    await sendTonConnectStartMessage(
      wallet,
      decryptedData.decryptedData,
      host,
      sessionKeypair,
      clientId,
      r
    )

    await addTonConnectSession({
      secretKey: Buffer.from(sessionKeypair.secretKey),
      userId: clientId,
      keyId: selectedKey.id.get() || 0,
      walletId: selectedWallet.id,
      iconUrl: metaInfo.iconUrl,
      name: metaInfo.name,
      url: metaInfo.url,
    })

    setConnectLink('')
  }, [connectLink, decryptedData.decryptedData])

  return (
    <Block className="flex flex-col gap-2">
      {/* <div className="flex"> */}
      <label htmlFor="tonconnectLink">Enter your Ton Connect link</label>
      <input
        type="text"
        id="tonconnectLink"
        autoComplete="off"
        className="border w-full outline-none rounded p-2"
        value={connectLink}
        onChange={(e) => setConnectLink(e.target.value)}
      />
      <div className="flex gap-2">
        <BlueButton onClick={() => doBridgeAuth()}>Connect</BlueButton>
        <BlueButton onClick={() => detect()} className={clsx(isDetecting && 'bg-gray-400')}>
          Detect Code
        </BlueButton>
      </div>
      {/* </div> */}
    </Block>
  )
}

export async function sendTonConnectStartMessage(
  wallet: IWallet,
  decryptedData: DecryptedWalletData | undefined,
  host: string,
  sessionKeyPair: KeyPair,
  sessionClientId: string,
  connectRequest?: ConnectRequest
) {
  let stateInit: Cell
  switch (wallet.type) {
    case 'highload':
      stateInit = beginCell()
        .store(storeStateInit(wallet.wallet.stateInit as unknown as StateInit))
        .endCell()
      break
    case 'highload_v2r2':
      stateInit = beginCell()
        .store(storeStateInit(wallet.wallet.stateInit as unknown as StateInit))
        .endCell()
      break
    case 'highload_v3':
      stateInit = beginCell()
        .store(storeStateInit(wallet.wallet.init as unknown as StateInit))
        .endCell()
      break
    case 'v3R2':
      stateInit = beginCell()
        .store(storeStateInit(wallet.wallet.init as unknown as StateInit))
        .endCell()
      break
    case 'v4R2':
      stateInit = beginCell()
        .store(storeStateInit(wallet.wallet.init as unknown as StateInit))
        .endCell()
      break
    case 'multisig_v2_v4r2':
      stateInit = beginCell()
        .store(storeStateInit(wallet.wallet.init as unknown as StateInit))
        .endCell()
      break
    case 'v5R1':
      stateInit = beginCell()
        .store(storeStateInit(wallet.wallet.init as unknown as StateInit))
        .endCell()
      break
    default:
      throw new Error('Unknown wallet type!')
  }

  let keyPair // = secretKeyToED25519(decryptedData?.seed || Buffer.from([]))
  let publicKey // = keyPair.publicKey.toString('base64')

  try {
    keyPair = secretKeyToED25519(decryptedData?.seed || Buffer.from([]))
    publicKey = keyPair.publicKey.toString('hex')
  } catch (e) {}

  const proof = connectRequest?.items.find((i) => i.name === 'ton_proof') as TonProofItem
  const timestamp = Math.floor(Date.now() / 1000)
  const domain = {
    LengthBytes: Buffer.from(host).length,
    Value: host,
  }

  const data: ConnectEventSuccess = {
    event: 'connect',
    id: Date.now(),
    payload: {
      device: {
        platform: 'windows',
        appName: 'tonkeeper',
        appVersion: '0.3.3',
        maxProtocolVersion: 2,
        features: [
          {
            name: 'SendTransaction',
            maxMessages:
              wallet.type === 'highload' || wallet.type === 'highload_v2r2'
                ? 250
                : wallet.type === 'highload_v3'
                  ? 500
                  : 1,
            extraCurrencySupported: true,
          },
        ],
      },
      items: [
        {
          name: 'ton_addr',
          address: wallet.address.toRawString(),
          network: LiteClientState.selectedNetwork.is_testnet.get() ? CHAIN.TESTNET : CHAIN.MAINNET,
          walletStateInit: stateInit.toBoc().toString('base64'),
          publicKey,
        },
      ],
    },
  }

  if (proof) {
    if (!decryptedData?.seed) {
      throw new Error('no wallet seed')
    }

    const walletKeyPair = secretKeyToED25519(decryptedData.seed)

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

export function getImageFromBase64(data: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = function () {
      resolve(image)
    }
    image.onerror = (e) => {
      reject(e)
    }
    image.src = `data:image/png;base64,${data}`
  })
}

export async function getQrcodeFromScreen(): Promise<string | undefined> {
  let res: string[] = []
  try {
    await appWindow.minimize()
    await delay(64)
    res = (await invoke('detect_qr_code')) as string[]
  } finally {
    await appWindow.unminimize()
    await appWindow.setFocus()
  }

  if (res.length > 0) {
    return res[0]
  }

  return undefined
}
