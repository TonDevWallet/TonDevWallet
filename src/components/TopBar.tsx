import { changeLiteClient, useLiteclient, useLiteclientState } from '@/store/liteClient'
import { LiteClient } from 'ton-lite-client'
import { cleanPassword, openPasswordPopup, usePassword } from '@/store/passwordManager'
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
  faProjectDiagram,
  faList,
} from '@fortawesome/free-solid-svg-icons'
import { PasswordPopup } from '@/components/SavedWalletsList/PasswordPopup'
import { cn } from '@/utils/cn'
import { useTheme } from '@/hooks/useTheme'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { HomeLink } from './HomeLink'

function NetworkSelector() {
  const liteClientState = useLiteclientState()
  const liteClient = useLiteclient() as LiteClient

  const [readyEngines, setReadyEngines] = useState(0)

  const changeLiteClientNetwork = (newNetworkIdString: string) => {
    const newNetworkId = parseInt(newNetworkIdString, 10)

    changeLiteClient(newNetworkId).then((newLiteClient) => {
      if (!newLiteClient) {
        return
      }
      setReadyEngines((newLiteClient.engine as any).readyEngines.length)
      setTimeout(() => {
        setReadyEngines((newLiteClient.engine as any).readyEngines.length)
      }, 500)
    })
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setReadyEngines((liteClient.engine as any).readyEngines.length)
    }, 1000)
    return () => clearInterval(interval)
  }, [liteClient])

  return (
    <div className="cursor-pointer rounded flex flex-col items-center my-2">
      <label
        className="rounded-full h-8 relative
    flex items-center justify-center text-sm cursor-pointer text-foreground gap-2"
        htmlFor="apiKeyInput"
      >
        <Select
          value={liteClientState.selectedNetwork.network_id.get().toString()}
          onValueChange={changeLiteClientNetwork}
        >
          <SelectTrigger className="w-[180px] focus-visible:ring-0 ring-0 focus:ring-0 overflow-hidden">
            <div className="grid grid-cols-[128px_0px] w-full items-center">
              <div className="flex items-center gap-2 w-full">
                <FontAwesomeIcon icon={faGlobe} size="xs" />
                <div className="truncate">
                  <SelectValue placeholder="Network" />
                </div>
              </div>
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  readyEngines > 0 ? 'bg-green-500' : 'bg-yellow-700'
                )}
              />
            </div>
          </SelectTrigger>
          <SelectContent className="">
            {liteClientState.networks.get().map((network) => {
              return (
                <SelectItem
                  value={network.network_id.toString()}
                  key={network.network_id + network.name}
                >
                  {network.name}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </label>
    </div>
  )
}

function PasswordUnlock() {
  const passwordState = usePassword()
  return (
    <>
      {passwordState.password.get() ? (
        <TopBarIconWrapper onClick={cleanPassword} icon={faLockOpen} />
      ) : (
        <TopBarIconWrapper onClick={openPasswordPopup} icon={faLock} />
      )}
    </>
  )
}

function ThemeSwitcher() {
  const [theme, setTheme] = useTheme()

  return (
    <TopBarIconWrapper
      onClick={() => {
        setTheme(theme === 'light' ? 'dark' : 'light')
      }}
      icon={theme === 'dark' ? faMoon : faSun}
    />
  )
}

function TopBarIconWrapper({
  icon,
  to,
  onClick,
}: {
  icon: IconDefinition
  to?: string
  onClick?: () => void
}) {
  const children = (
    <div
      className="rounded-lg px-2 h-8 relative
        flex items-center justify-center text-sm cursor-pointer text-foreground gap-2 hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <FontAwesomeIcon icon={icon} size="xs" className="" />
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
      className="rounded-lg px-4 h-8 relative
        flex items-center justify-center text-sm cursor-pointer text-foreground gap-2 hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <FontAwesomeIcon icon={icon} size="xs" className="" />
      <div className="hidden lg:block text-foreground">{text}</div>
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

export function TopBar() {
  return (
    <div className={cn('flex flex-wrap py-2 px-4 gap-4 w-full')}>
      <NetworkSelector />

      <ThemeSwitcher />
      <PasswordUnlock />

      <HomeLink />

      <PasswordPopup />

      <TopBarLinkWrapper to="/app/new_wallet" icon={faPlus} text="New Wallet" />
      <TopBarLinkWrapper to="/app/wallets_list" icon={faList} text="All Wallets" />
      <TopBarLinkWrapper to="/app/tracer" icon={faProjectDiagram} text="Tracer" />
      <TopBarLinkWrapper to="/app/settings" icon={faGear} text="Settings" />

      <DetectTonConnect />
    </div>
  )
}
