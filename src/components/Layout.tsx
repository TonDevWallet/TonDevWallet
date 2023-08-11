import { useTauriEventListener } from '@/eventListener'
import { usePassword } from '@/store/passwordManager'
import { Outlet } from 'react-router-dom'
import { SavedWalletsList } from './SavedWalletsList/SavedWalletsList'
import { SetPasswordPage } from './SetPasswordPage'
import { TonConnectListener } from './TonConnect/TonConnectListener'
import { TonConnectPopup } from './TonConnect/TonConnectPopup'
import { WebviewWindow } from '@tauri-apps/api/window'

export function Layout() {
  const passworState = usePassword()

  useTauriEventListener()

  return (
    <>
      {passworState.passwordExists.get() ? (
        <div className="grid grid-cols-[128px_minmax(128px,_1fr)] h-screen w-full overflow-y-scroll">
          <div className="h-screen sticky top-0 place-self-start bg-transparent overflow-y-scroll overscroll-contain w-full">
            <TonConnectListener />
            <SavedWalletsList />
            <button
              onClick={() => {
                const webview = new WebviewWindow(`CustomTxInfo`, {
                  focus: true,
                  transparent: true,
                  decorations: false,
                  url: '/customtxinfo',
                  center: true,
                  title: `Custom TX Info`,
                })
              }}
            >
              Open Logs page
            </button>
          </div>
          <div className="w-full bg-window-background px-2 shadow" id="outlet">
            <Outlet />
          </div>
        </div>
      ) : (
        <SetPasswordPage />
      )}
      <TonConnectPopup />
    </>
  )
}
