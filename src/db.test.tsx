import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { AppDatabase } from './db'

type DatabaseConnection = ConstructorParameters<typeof AppDatabase>[0]
type ExecuteResult = { rowsAffected: number; lastInsertId: number }
type InvokeCall = { command: string; args?: Record<string, unknown> }
type ConnectionCall = { kind: 'select' | 'execute' | 'close'; sql?: string; values?: unknown[] }

const transactionContext = { clientId: 42 }
const invokeCalls: InvokeCall[] = []
const connectionCalls: ConnectionCall[] = []

let selectRows: unknown[] = []
let executeResult: ExecuteResult = { rowsAffected: 1, lastInsertId: 0 }
let rejectCommand: string | undefined

function installInvokeMock() {
  ;(globalThis as unknown as { window: unknown }).window = {
    __TAURI_INTERNALS__: {
      invoke: async (command: string, args?: Record<string, unknown>) => {
        invokeCalls.push({ command, args })

        if (command === rejectCommand) {
          throw new Error(`${command} failed`)
        }

        switch (command) {
          case 'db_acquire_client':
            return transactionContext
          case 'db_client_select':
            return selectRows
          case 'db_client_execute':
            return executeResult
          case 'db_release_client':
            return undefined
          default:
            throw new Error(`unexpected invoke command: ${command}`)
        }
      },
    },
  }
}

function createConnection(): DatabaseConnection {
  return {
    select: async <T,>(sql: string, values?: unknown[]) => {
      connectionCalls.push({ kind: 'select', sql, values })
      return selectRows as T
    },
    execute: async (sql: string, values?: unknown[]) => {
      connectionCalls.push({ kind: 'execute', sql, values })
      return executeResult
    },
    close: async () => {
      connectionCalls.push({ kind: 'close' })
    },
  } as unknown as DatabaseConnection
}

beforeEach(() => {
  invokeCalls.length = 0
  connectionCalls.length = 0
  selectRows = [{ id: 7 }]
  executeResult = { rowsAffected: 1, lastInsertId: 0 }
  rejectCommand = undefined
  installInvokeMock()
})

describe('AppDatabase transaction API', () => {
  it('does not expose the removed multi-statement transaction helper', () => {
    assert.equal('executeTransaction' in AppDatabase.prototype, false)
    assert.equal('transaction' in AppDatabase.prototype, false)
  })

  it('uses the underlying connection outside transactions and normalizes bindings', async () => {
    const db = new AppDatabase(createConnection())
    const date = new Date('2026-01-02T03:04:05.000Z')

    const rows = await db.select('SELECT ?', [date, true, false, undefined, null, 'ok', 3])
    const result = await db.execute('UPDATE values SET ok = ?', [false])

    assert.deepEqual(rows, [{ id: 7 }])
    assert.deepEqual(result, { rowsAffected: 1, lastInsertId: 0 })
    assert.deepEqual(connectionCalls, [
      {
        kind: 'select',
        sql: 'SELECT ?',
        values: [date.valueOf(), 1, 0, null, null, 'ok', 3],
      },
      { kind: 'execute', sql: 'UPDATE values SET ok = ?', values: [0] },
    ])
    assert.deepEqual(invokeCalls, [])
  })

  it('pins a client context and allows SELECT between BEGIN and COMMIT', async () => {
    const db = new AppDatabase(createConnection())
    selectRows = [{ id: 11 }]

    const client = await db.connect()
    await client.execute('BEGIN')
    const rows = await client.select<{ id: number }>('SELECT id FROM items WHERE enabled = ?', [
      true,
    ])
    await client.execute('COMMIT')
    await client.release()

    assert.deepEqual(rows, [{ id: 11 }])
    assert.deepEqual(connectionCalls, [])
    assert.deepEqual(
      invokeCalls.map((call) => call.command),
      [
        'db_acquire_client',
        'db_client_execute',
        'db_client_select',
        'db_client_execute',
        'db_release_client',
      ]
    )
    assert.deepEqual(invokeCalls[1]?.args, {
      context: transactionContext,
      sql: 'BEGIN',
      values: [],
    })
    assert.deepEqual(invokeCalls[2]?.args, {
      context: transactionContext,
      sql: 'SELECT id FROM items WHERE enabled = ?',
      values: [1],
    })
    assert.deepEqual(invokeCalls[3]?.args, {
      context: transactionContext,
      sql: 'COMMIT',
      values: [],
    })
    assert.deepEqual(invokeCalls[4]?.args, { context: transactionContext })
  })

  it('keeps the pinned client reserved through manual ROLLBACK and release', async () => {
    const db = new AppDatabase(createConnection())
    const client = await db.connect()

    await client.execute('BEGIN')
    await client.execute('UPDATE items SET name = ?', ['new'])
    await client.execute('ROLLBACK')
    await client.release()

    assert.deepEqual(
      invokeCalls.map((call) => call.command),
      [
        'db_acquire_client',
        'db_client_execute',
        'db_client_execute',
        'db_client_execute',
        'db_release_client',
      ]
    )
    assert.deepEqual(invokeCalls[1]?.args, {
      context: transactionContext,
      sql: 'BEGIN',
      values: [],
    })
    assert.deepEqual(invokeCalls[2]?.args, {
      context: transactionContext,
      sql: 'UPDATE items SET name = ?',
      values: ['new'],
    })
    assert.deepEqual(invokeCalls[3]?.args, {
      context: transactionContext,
      sql: 'ROLLBACK',
      values: [],
    })
    assert.deepEqual(invokeCalls[4]?.args, { context: transactionContext })
  })

  it('releases a pinned client exactly once and rejects later use', async () => {
    const db = new AppDatabase(createConnection())
    const client = await db.getClient()

    await client.release()
    await client.release()

    assert.throws(() => client.select('SELECT 1'), /released/)
    assert.throws(() => client.execute('SELECT 1'), /released/)
    assert.deepEqual(
      invokeCalls.map((call) => call.command),
      ['db_acquire_client', 'db_release_client']
    )
  })
})
