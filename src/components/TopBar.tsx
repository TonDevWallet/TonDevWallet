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
  IconDefinition,
  faGear,
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
    const newNetworkId =
      liteClientState.networks
        .get()
        .find((n) => n.network_id !== liteClientState.selectedNetwork.network_id.get())
        ?.network_id || 0

    changeLiteClient(newNetworkId).then((newLiteClient) => {
      if (!newLiteClient) {
        return
      }
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
    <div className={cn('flex py-2 px-4 justify-between')}>
      <div className="flex">
        <div className="cursor-pointer rounded flex flex-col items-center my-2">
          <label
            className="rounded-full px-4 h-8 relative
            flex items-center justify-center text-sm cursor-pointer text-foreground gap-2"
            htmlFor="apiKeyInput"
          >
            <FontAwesomeIcon icon={faGlobe} size="xs" />
            <div className="w-12">{liteClientState.selectedNetwork.name.get()}</div>
            <input
              className="hidden"
              type="checkbox"
              id="apiKeyInput"
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

        <TopBarLinkWrapper to="/app/new_wallet" icon={faPlus} text="New Wallet" />
        <TopBarLinkWrapper to="/app/settings" icon={faGear} text="Settings" />
      </div>

      <div className="flex">
        <ChangePasswordPopup />
        <PasswordUnlock />
      </div>
    </div>
  )
}

function PasswordUnlock() {
  const passwordState = usePassword()
  return (
    <>
      {passwordState.password.get() ? (
        <TopBarLinkWrapper onClick={cleanPassword} icon={faLockOpen} text="Unlocked" />
      ) : (
        <TopBarLinkWrapper onClick={openPasswordPopup} icon={faLock} text="Locked" />
      )}
    </>
  )
}

function ThemeSwitcher() {
  const [theme, setTheme] = useTheme()

  return (
    <TopBarLinkWrapper
      onClick={() => {
        console.log('click', setTheme)
        setTheme((theme === 'light' ? 'dark' : 'light') as Theme)
      }}
      icon={theme === 'dark' ? faMoon : faSun}
      text="Theme"
    />
  )
}

function TopBarLinkWrapper({
  icon,
  text,
  to,
  onClick,
}: {
  icon: IconDefinition
  text: string
  to?: string
  onClick?: () => void
}) {
  const children = (
    <div
      className="rounded-full px-4 h-8 relative
        flex items-center justify-center text-sm cursor-pointer text-foreground gap-2"
      onClick={onClick}
    >
      <FontAwesomeIcon icon={icon} size="xs" className="" />
      <div className="text-foreground">{text}</div>
    </div>
  )
  return to ? (
    <NavLink
      to={to}
      className="cursor-pointer rounded flex flex-col items-center my-2"
      onClick={onClick}
    >
      {children}
    </NavLink>
  ) : (
    <div className="cursor-pointer rounded flex flex-col items-center my-2">{children}</div>
  )
}
