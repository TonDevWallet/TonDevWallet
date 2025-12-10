import { useLiteclient } from '@/store/liteClient'
import { useTonConnectState } from '@/store/tonConnect'
import { useSelectedKey, useSelectedWallet } from '@/store/walletState'
import { getWalletFromKey } from '@/utils/wallets'
import { useCallback, useState } from 'react'
import { LiteClient } from 'ton-lite-client'
import { BlueButton } from '../ui/BlueButton'
import { Block } from '../ui/Block'
import { invoke } from '@tauri-apps/api/core'
import clsx from 'clsx'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { delay } from '@/utils'
import { getWalletKit } from '@/services/walletKit'
const appWindow = getCurrentWebviewWindow()

export function TonConnect() {
  const [connectLink, setConnectLink] = useState('')
  const [isDetecting, setIsDetecting] = useState(false)
  const liteClient = useLiteclient() as unknown as LiteClient
  const tonConnectState = useTonConnectState()

  const selectedWallet = useSelectedWallet()
  const selectedKey = useSelectedKey()

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

  // Use WalletKit to handle TonConnect URL - this opens the popup for wallet selection
  const doConnect = useCallback(async () => {
    if (!connectLink) {
      return
    }

    try {
      tonConnectState.connectArg.set(connectLink)
      tonConnectState.popupOpen.set(true)

      const kit = await getWalletKit()
      await kit.handleTonConnectUrl(connectLink)
    } catch (e) {
      console.log('WalletKit handleTonConnectUrl error', e)
    }

    setConnectLink('')
  }, [connectLink, tonConnectState])

  return (
    <Block className="flex flex-col gap-2">
      <label htmlFor="tonconnectLink">Enter your Ton Connect link</label>
      <input
        type="text"
        id="tonconnectLink"
        autoComplete="off"
        className="border w-full outline-hidden rounded p-2"
        value={connectLink}
        onChange={(e) => setConnectLink(e.target.value)}
      />
      <div className="flex gap-2">
        <BlueButton onClick={() => doConnect()}>Connect</BlueButton>
        <BlueButton onClick={() => detect()} className={clsx(isDetecting && 'bg-gray-400')}>
          Detect Code
        </BlueButton>
      </div>
    </Block>
  )
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
