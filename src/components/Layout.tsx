import { Outlet } from 'react-router-dom'
import { SavedWalletsList } from './SavedWalletsList/SavedWalletsList'
import { TonConnectListener } from './TonConnect/TonConnectListener'

export function Layout() {
  return (
    <div className="grid grid-cols-[128px_minmax(128px,_1fr)] w-full pr-4">
      <div className="h-screen sticky top-0 place-self-start">
        <TonConnectListener />
        <SavedWalletsList />
      </div>
      <div className="w-full">
        <Outlet />
      </div>
    </div>
  )
}
