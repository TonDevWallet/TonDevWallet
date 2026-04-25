import { useTauriEventListener } from '@/eventListener'
import { usePassword } from '@/store/passwordManager'
import { Outlet, useLocation } from 'react-router-dom'
import { SetPasswordPage } from './SetPasswordPage'
import { TonConnectListener } from './TonConnect/TonConnectListener'
import { TonConnectPopup } from './TonConnect/TonConnectPopup'
import { TopBar } from '@/components/TopBar'
import { useMemo } from 'react'
import { cn } from '@/utils/cn'

export function Layout() {
  const passwordState = usePassword()
  const currentPath = useLocation()

  useTauriEventListener()

  const isTracerPage = useMemo(() => currentPath.pathname === '/app/tracer', [currentPath])

  return (
    <>
      {passwordState.passwordExists.get() ? (
        <div
          className={cn(
            'grid grid-cols-1',
            'grid-rows-[minmax(auto,max-content)_minmax(120px,1fr)] lg:grid-rows-[64px_minmax(120px,1fr)]',
            'h-screen w-full overflow-y-hidden'
          )}
        >
          <div className="border-b">
            <TopBar />
          </div>

          {!isTracerPage && <TonConnectListener />}

          <div
            className={cn(
              'w-full h-full overflow-y-scroll bg-window-background px-6 shadow-sm pt-4',
              isTracerPage && 'px-0 pt-0'
            )}
            id="outlet"
          >
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
