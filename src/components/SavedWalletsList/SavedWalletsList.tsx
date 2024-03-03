import { SavedWalletRow } from './SavedWalletRow'
import { suspend } from '@hookstate/core'
import { useWalletListState } from '@/store/walletsListState'
import { NavLink } from 'react-router-dom'
import { useAppInfo } from '@/hooks/useAppInfo'
import { getDatabase } from '@/db'
import { ImportMigrations } from '@/utils/getMigrations'
import { Button } from '../ui/button'
import debug from 'debug'

const showRollback = true

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

        {showRollback && (
          <>
            <Button
              onClick={async () => {
                const db = await getDatabase()
                debug.enable('knex:*')
                // localStorage.debug = 'knex:*'
                await db.migrate.up({
                  migrationSource: new ImportMigrations(),
                })
                debug.enable('')
                // localStorage.debug = ''
              }}
            >
              Migrate Up
            </Button>
            <Button
              onClick={async () => {
                const db = await getDatabase()
                // localStorage.debug = 'knex:*'
                debug.enable('knex:*')
                await db.migrate.down({
                  migrationSource: new ImportMigrations(),
                })
                debug.enable('')
                // localStorage.debug = ''
              }}
            >
              Migrate Down
            </Button>
          </>
        )}
      </div>
    )
  )
}
