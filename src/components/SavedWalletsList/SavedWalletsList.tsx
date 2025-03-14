import { SavedWalletRow } from './SavedWalletRow'
import { suspend } from '@hookstate/core'
import { useWalletListState } from '@/store/walletsListState'
import { useAppInfo } from '@/hooks/useAppInfo'
import { getDatabase } from '@/db'
import { ImportMigrations } from '@/utils/getMigrations'
import { Button } from '../ui/button'
import debug from 'debug'

const showRollback = false

export function SavedWalletsList() {
  const keys = useWalletListState()

  const { version } = useAppInfo()

  return (
    suspend(keys) || (
      <div className="p-2">
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
