import { SavedWalletRow } from './SavedWalletRow'
import { suspend } from '@hookstate/core'
import { useWalletListState } from '@/store/walletsListState'
import { NavLink } from 'react-router-dom'
import { useAppInfo } from '@/hooks/useAppInfo'

export function SavedWalletsList() {
  const keys = useWalletListState()

  const { version } = useAppInfo()

  return (
    suspend(keys) || (
      <div className="p-2">
        <NavLink
          to="/app"
          end
          className={({ isActive }) =>
            'cursor-pointer rounded p-1 flex flex-col items-center my-2 ' +
            (isActive ? 'bg-foreground/5' : '')
          }
        >
          <div
            className="rounded-full w-16 h-16 bg-foreground/5
            flex items-center justify-center text-[32px] text-foreground"
          >
            /
          </div>
          <div className="text-foreground">Home</div>
        </NavLink>

        {keys &&
          keys.map((dbWallet) => <SavedWalletRow walletKey={dbWallet} key={dbWallet.get().id} />)}

        <div className="text-center mt-4 text-sm text-gray-400">v{version}</div>

        {/* <BlueButton
          onClick={async () => {
            const db = await getDatabase()
            await db.migrate.down({
              migrationSource: new ImportMigrations(),
            })
          }}
        >
          Migrate back
        </BlueButton> */}
      </div>
    )
  )
}
