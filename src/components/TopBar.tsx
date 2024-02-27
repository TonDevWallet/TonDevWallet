import { changeLiteClient, useLiteclient, useLiteclientState } from '@/store/liteClient'
import { useTonConnectSessions } from '@/store/tonConnect'
import { LiteClient } from 'ton-lite-client'
import { useWalletListState } from '@/store/walletsListState'
import { cleanPassword, openPasswordPopup, usePassword } from '@/store/passwordManager'
import { secretKeyToX25519 } from '@/utils/ed25519'
import { KeyPair } from '@ton/crypto'
import { getWalletFromKey } from '@/utils/wallets'
import { IWallet } from '@/types'
import { sendTonConnectStartMessage } from '@/components/TonConnect/TonConnect'
import { DetectTonConnect } from '@/components/SavedWalletsList/DetectTonConnect'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faGlobe,
  faLock,
  faLockOpen,
  faMoon,
  faPlus,
  faSun,
} from '@fortawesome/free-solid-svg-icons'
import { ChangePasswordPopup } from '@/components/SavedWalletsList/ChangePasswordPopup'
import { PasswordPopup } from '@/components/SavedWalletsList/PasswordPopup'
import { cn } from '@/utils/cn'
import { useTheme } from '@/hooks/useTheme'
import { Theme } from '@tauri-apps/api/window'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

export function TopBar() {
  const liteClientState = useLiteclientState()
  const sessions = useTonConnectSessions()
  const liteClient = useLiteclient() as LiteClient
  const keys = useWalletListState()

  const [readyEngines, setReadyEngines] = useState(0)

  const changeLiteClientNetwork = () => {
    changeLiteClient(!liteClientState.testnet.get()).then((newLiteClient) => {
      setReadyEngines((newLiteClient.engine as any).readyEngines.length)
      setTimeout(() => {
        setReadyEngines((newLiteClient.engine as any).readyEngines.length)
      }, 500)
    })

    for (const s of sessions.get()) {
      const key = keys.find((k) => k.id.get() === s.keyId)
      if (!key) {
        return
      }

      const wallet = key.wallets.get()?.find((w) => w.id === s.walletId)
      if (!wallet) {
        return
      }

      const sessionKeyPair = secretKeyToX25519(s.secretKey) as KeyPair

      const tonWallet = getWalletFromKey(liteClient, key.get(), wallet) as IWallet

      const serviceUrl = new URL(s.url)
      const host = serviceUrl.host

      sendTonConnectStartMessage(tonWallet, undefined, host, sessionKeyPair, s.userId)
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setReadyEngines((liteClient.engine as any).readyEngines.length)
    }, 1000)
    return () => clearInterval(interval)
  }, [liteClient])

  return (
    <div className={cn('flex py-2 px-4 gap-4')}>
      <div className="cursor-pointer rounded flex flex-col items-center my-2">
        <label
          className="rounded-full px-4 h-8 relative
            flex items-center justify-center text-sm cursor-pointer text-foreground gap-2"
          htmlFor="apiKeyInput"
        >
          <FontAwesomeIcon icon={faGlobe} size="xs" />
          <div className="w-12">{liteClientState.testnet.get() ? 'Testnet' : 'Mainnet'}</div>
          <input
            className="hidden"
            type="checkbox"
            id="apiKeyInput"
            checked={liteClientState.testnet.get()}
            onChange={changeLiteClientNetwork}
          />
          <div
            className={cn(
              'w-2 h-2 rounded-full top-[44px]',
              readyEngines > 0 ? 'bg-green-500' : 'bg-yellow-700'
            )}
          />
        </label>
      </div>

      <DetectTonConnect />

      <PasswordPopup />

      <ThemeSwitcher />

      <NewWalletLink />

      <ChangePasswordPopup />
      <PasswordUnlock />
    </div>
  )
}

function PasswordUnlock() {
  const passwordState = usePassword()
  return (
    <>
      {passwordState.password.get() ? (
        <div
          onClick={cleanPassword}
          className={'cursor-pointer rounded flex flex-col items-center my-2 text-center'}
        >
          <div
            className="rounded-full px-4 h-8 relative
              flex items-center justify-center text-sm cursor-pointer text-foreground gap-2"
          >
            <FontAwesomeIcon icon={faLockOpen} size="xs" />
            <div className="text-foreground">Unlocked</div>
          </div>
        </div>
      ) : (
        <div
          onClick={openPasswordPopup}
          className={'cursor-pointer rounded flex flex-col items-center my-2 text-center'}
        >
          <div
            className="rounded-full px-4 h-8 relative
              flex items-center justify-center text-sm cursor-pointer text-foreground gap-2"
          >
            <FontAwesomeIcon icon={faLock} size="xs" />
            <div className="text-foreground">Locked</div>
          </div>
        </div>
      )}
    </>
  )
}

function ThemeSwitcher() {
  const [theme, setTheme] = useTheme()

  return (
    <div className="cursor-pointer rounded flex flex-col items-center my-2">
      <label
        className="rounded-full px-4 h-8 relative
          flex items-center justify-center text-sm cursor-pointer text-foreground gap-2"
        onClick={() => {
          console.log('click', setTheme)
          setTheme((theme === 'light' ? 'dark' : 'light') as Theme)
        }}
      >
        <FontAwesomeIcon icon={theme === 'dark' ? faMoon : faSun} size="xs" />
        <div className="text-foreground">Theme</div>
      </label>
    </div>
  )
}

function NewWalletLink() {
  return (
    <NavLink
      to="/app/new_wallet"
      className="cursor-pointer rounded flex flex-col items-center my-2"
    >
      <div
        className="rounded-full px-4 h-8 relative
          flex items-center justify-center text-sm cursor-pointer text-foreground gap-2"
      >
        <FontAwesomeIcon icon={faPlus} size="xs" />
        <div className="text-foreground">New Wallet</div>
      </div>
    </NavLink>
  )
}
