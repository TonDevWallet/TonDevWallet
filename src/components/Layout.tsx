import { useTauriEventListener } from '@/eventListener'
import { usePassword } from '@/store/passwordManager'
import { Outlet } from 'react-router-dom'
import { SavedWalletsList } from './SavedWalletsList/SavedWalletsList'
import { SetPasswordPage } from './SetPasswordPage'
import { TonConnectListener } from './TonConnect/TonConnectListener'
import { TonConnectPopup } from './TonConnect/TonConnectPopup'
import { TopBar } from '@/components/TopBar'

export function Layout() {
  const passwordState = usePassword()

  useTauriEventListener()

  return (
    <>
      {passwordState.passwordExists.get() ? (
        <>
          <div
            className="grid

              grid-cols-[128px_minmax(128px,1fr)]
              grid-rows-[minmax(auto,max-content)_minmax(120px,1fr)] lg:grid-rows-[64px_minmax(120px,1fr)]

              h-screen w-full overflow-y-hidden"
          >
            <div className="col-span-2 border-b">
              <TopBar />
            </div>

            <div className="h-full sticky top-0 place-self-start bg-transparent overflow-y-scroll overscroll-contain w-full">
              <TonConnectListener />
              <SavedWalletsList />
            </div>
            <div
              className="w-full h-full overflow-y-scroll bg-window-background px-6 shadow-sm pt-4"
              id="outlet"
            >
              <Outlet />
            </div>
          </div>
        </>
      ) : (
        <SetPasswordPage />
      )}
      <TonConnectPopup />
    </>
  )
}
