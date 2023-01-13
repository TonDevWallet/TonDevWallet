import { Outlet } from 'react-router-dom'
import { SavedWalletsList } from './SavedWalletsList/SavedWalletsList'
import { TonConnectListener } from './TonConnect/TonConnectListener'

export function Layout() {
  return (
    <div className="grid grid-cols-[128px_minmax(128px,_1fr)] justify-center flex-col md:flex-row w-full overflow-hidden">
      <div className="h-screen overflow-y-scroll overflow-x-hidden w-28">
        <TonConnectListener />
        <SavedWalletsList />
      </div>
      <div className="w-full">
        <Outlet />
      </div>
    </div>
  )
}
