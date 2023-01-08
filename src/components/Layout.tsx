import { Outlet } from 'react-router-dom'
import { SavedWalletsList } from './SavedWalletsList/SavedWalletsList'

export function Layout() {
  return (
    <div className="grid grid-cols-[128px_1fr] justify-center flex-col md:flex-row">
      <div className="flex-shrink-0">
        <SavedWalletsList />
      </div>
      <div>
        <Outlet />
      </div>
    </div>
  )
}
