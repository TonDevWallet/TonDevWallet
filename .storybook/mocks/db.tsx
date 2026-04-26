import { Buffer } from 'buffer'
import { createContext, useContext } from 'react'

type Row = Record<string, any>
type SqlValue = string | number | boolean | Date | null | undefined
type TransactionStatement = {
  sql: string
  bindings?: SqlValue[]
  returnRows?: boolean
  expectedRowsAffected?: number
}

const now = new Date('2026-01-01T00:00:00.000Z')
const publicKeyA = Buffer.alloc(32, 1).toString('base64')
const publicKeyB = Buffer.alloc(32, 2).toString('base64')

export const storybookTables: Record<string, Row[]> = {
  settings: [
    { id: 1, name: 'password', value: 'storybook-password' },
    { id: 2, name: 'selected_network', value: '1' },
    {
      id: 3,
      name: 'extra_currency_config',
      value: JSON.stringify({ 0: { '1001': { symbol: 'DBG', decimals: 9 } } }),
    },
  ],
  networks: [
    {
      id: 1,
      network_id: 1,
      name: 'Mainnet',
      url: 'https://ton-blockchain.github.io/global.config.json',
      item_order: 0,
      is_default: true,
      is_testnet: false,
      scanner_url: 'https://tonviewer.com/',
      toncenter3_url: 'https://toncenter.com/api/v3/',
      lite_engine_host_mode: 'auto',
      lite_engine_host_custom: '',
      blockchain_source: 'tonapi',
      tonapi_url: 'https://tonapi.io',
      tonapi_token: '',
      toncenter_token: '',
      created_at: now,
      updated_at: now,
    },
    {
      id: 2,
      network_id: 2,
      name: 'Testnet',
      url: 'https://ton-blockchain.github.io/testnet-global.config.json',
      item_order: 1,
      is_default: true,
      is_testnet: true,
      scanner_url: 'https://testnet.tonviewer.com/',
      toncenter3_url: 'https://testnet.toncenter.com/api/v3/',
      lite_engine_host_mode: 'auto',
      lite_engine_host_custom: '',
      blockchain_source: 'tonapi',
      tonapi_url: 'https://testnet.tonapi.io',
      tonapi_token: '',
      toncenter_token: '',
      created_at: now,
      updated_at: now,
    },
  ],
  keys: [
    {
      id: 1,
      name: 'Primary signer',
      public_key: publicKeyA,
      encrypted: JSON.stringify({
        cypher: 'encrypted-scrypt-tweetnacl',
        salt: 'storybook',
        N: 1,
        r: 1,
        p: 1,
      }),
      sign_type: 'ton',
    },
    {
      id: 2,
      name: 'Watch-only treasury',
      public_key: publicKeyB,
      encrypted: null,
      sign_type: 'ton',
    },
  ],
  wallets: [
    {
      id: 101,
      key_id: 1,
      type: 'v5R1',
      subwallet_id: '2147483409',
      wallet_address: null,
      extra_data: null,
      name: 'Everyday v5',
      workchain_id: 0,
    },
    {
      id: 102,
      key_id: 1,
      type: 'v4R2',
      subwallet_id: '698983191',
      wallet_address: null,
      extra_data: null,
      name: 'Legacy v4',
      workchain_id: 0,
    },
    {
      id: 201,
      key_id: 2,
      type: 'v5R1',
      subwallet_id: '2147483409',
      wallet_address: null,
      extra_data: null,
      name: 'Watch-only v5',
      workchain_id: 0,
    },
  ],
  connect_sessions: [
    {
      id: 1,
      secret_key: '00'.repeat(32),
      user_id: 'storybook-user',
      wallet_id: 101,
      key_id: 1,
      last_event_id: 7,
      url: 'https://dapp.example',
      name: 'Example dApp',
      icon_url: '',
      auto_send: false,
    },
  ],
  connect_message_transactions: [],
  last_selected_wallets: [],
  address_book: [
    {
      address_book_id: 1,
      network_id: 1,
      address: 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ',
      title: 'Zero address',
      description: 'Storybook saved recipient',
      created_at: Date.now(),
    },
  ],
}

const primaryKeys: Record<string, string> = {
  address_book: 'address_book_id',
  networks: 'network_id',
  last_selected_wallets: 'url',
}

function compactSql(sql: string) {
  return sql.replace(/\s+/g, ' ').trim()
}

function cloneRow(row: Row) {
  return { ...row }
}

function getPrimaryKey(table: string) {
  return primaryKeys[table] || 'id'
}

function nextId(table: string, key = getPrimaryKey(table)) {
  const rows = storybookTables[table] ?? []
  return rows.reduce((max, row) => Math.max(max, Number(row[key] ?? row.id ?? 0)), 0) + 1
}

function normalizeValue(value: SqlValue) {
  if (value instanceof Date) {
    return value.valueOf()
  }
  if (typeof value === 'boolean') {
    return Number(value)
  }
  return value ?? null
}

function normalizeParams(params: SqlValue[] = []) {
  return params.map(normalizeValue)
}

function tableFromSql(sql: string) {
  return sql.match(/\bfrom\s+([a-z_]+)/i)?.[1] || sql.match(/\binto\s+([a-z_]+)/i)?.[1]
}

class MockDatabase {
  async select<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    const compact = compactSql(sql)
    const lower = compact.toLowerCase()
    const normalizedParams = normalizeParams(params)

    if (lower.startsWith('insert into')) {
      return this.insertRows<T>(compact, normalizedParams, true)
    }

    const table = tableFromSql(compact)
    if (!table) {
      return []
    }

    let rows = this.filterRows(table, compact, normalizedParams)

    const order = compact.match(/order by ([a-z_]+)(?: (asc|desc))?/i)
    if (order) {
      const [, field, direction = 'asc'] = order
      const factor = direction.toLowerCase() === 'desc' ? -1 : 1
      rows = rows.sort((a, b) => (a[field] > b[field] ? factor : a[field] < b[field] ? -factor : 0))
    }

    if (lower.includes('count(')) {
      return [{ count: rows.length } as T]
    }

    const limitMatch = compact.match(/limit \? offset \?/i)
    if (limitMatch) {
      const limit = Number(normalizedParams[normalizedParams.length - 2] ?? rows.length)
      const offset = Number(normalizedParams[normalizedParams.length - 1] ?? 0)
      rows = rows.slice(offset, offset + limit)
    }

    return rows.map(cloneRow) as T[]
  }

  async first<T>(sql: string, params: SqlValue[] = []): Promise<T | undefined> {
    const rows = await this.select<T>(sql, params)
    return rows[0]
  }

  async execute(sql: string, params: SqlValue[] = []) {
    const compact = compactSql(sql)
    const lower = compact.toLowerCase()
    const normalizedParams = normalizeParams(params)

    if (lower === 'begin immediate' || lower === 'commit' || lower === 'rollback') {
      return { rowsAffected: 0, lastInsertId: undefined }
    }

    if (lower.startsWith('insert into last_selected_wallets') && lower.includes('on conflict')) {
      const [url, keyId, walletId] = normalizedParams
      const rows = (storybookTables.last_selected_wallets =
        storybookTables.last_selected_wallets ?? [])
      const existing = rows.find((row) => row.url === url)
      if (existing) {
        existing.key_id = keyId
        existing.wallet_id = walletId
        return { rowsAffected: 1, lastInsertId: undefined }
      }
      rows.push({ url, key_id: keyId, wallet_id: walletId })
      return { rowsAffected: 1, lastInsertId: undefined }
    }

    if (lower.startsWith('insert into')) {
      const rows = await this.insertRows<Row>(compact, normalizedParams, false)
      const table = tableFromSql(compact) || ''
      const primaryKey = getPrimaryKey(table)
      return { rowsAffected: rows.length, lastInsertId: rows[rows.length - 1]?.[primaryKey] }
    }

    if (lower.startsWith('update')) {
      const updateMatch = compact.match(/^update ([a-z_]+) set (.+) where ([a-z_]+) = \?$/i)
      if (!updateMatch) {
        return { rowsAffected: 0, lastInsertId: undefined }
      }
      const [, table, setPart, whereColumn] = updateMatch
      const columns = [...setPart.matchAll(/([a-z_]+)\s*=\s*\?/gi)].map((match) => match[1])
      const whereValue = normalizedParams[columns.length]
      let rowsAffected = 0
      for (const row of storybookTables[table] ?? []) {
        if (row[whereColumn] === whereValue) {
          columns.forEach((column, index) => {
            row[column] = normalizedParams[index]
          })
          rowsAffected += 1
        }
      }
      return { rowsAffected, lastInsertId: undefined }
    }

    if (lower.startsWith('delete from')) {
      const deleteMatch = compact.match(/^delete from ([a-z_]+) where ([a-z_]+) = \?$/i)
      if (!deleteMatch) {
        return { rowsAffected: 0, lastInsertId: undefined }
      }
      const [, table, whereColumn] = deleteMatch
      const before = storybookTables[table] ?? []
      const keep = before.filter((row) => row[whereColumn] !== normalizedParams[0])
      storybookTables[table] = keep
      return { rowsAffected: before.length - keep.length, lastInsertId: undefined }
    }

    return { rowsAffected: 0, lastInsertId: undefined }
  }

  async executeTransaction<T = unknown>(statements: TransactionStatement[]): Promise<T[][]> {
    const backup = Object.fromEntries(
      Object.entries(storybookTables).map(([table, rows]) => [table, rows.map(cloneRow)])
    )
    const results: T[][] = []

    try {
      for (const statement of statements) {
        if (statement.returnRows) {
          results.push(await this.select<T>(statement.sql, statement.bindings ?? []))
          continue
        }

        const result = await this.execute(statement.sql, statement.bindings ?? [])
        if (
          statement.expectedRowsAffected !== undefined &&
          result.rowsAffected !== statement.expectedRowsAffected
        ) {
          throw new Error(
            'Expected ' +
              statement.expectedRowsAffected +
              ' rows affected, got ' +
              result.rowsAffected
          )
        }
        results.push([])
      }
    } catch (error) {
      Object.keys(storybookTables).forEach((table) => delete storybookTables[table])
      Object.assign(storybookTables, backup)
      throw error
    }

    return results
  }

  async transaction<T>(callback: (tx: MockDatabase) => Promise<T>): Promise<T> {
    return callback(this)
  }

  async close() {
    return true
  }

  private filterRows(table: string, sql: string, params: unknown[]) {
    const lower = sql.toLowerCase()
    let rows = [...(storybookTables[table] ?? [])]

    if (!lower.includes(' where ')) {
      return rows
    }

    if (table === 'address_book' && lower.includes('lower(address) like')) {
      const hasLimit = lower.includes('limit ? offset ?')
      const whereParams = hasLimit ? params.slice(0, -2) : params
      const [networkId, search] = whereParams
      const needle = String(search ?? '')
        .replace(/%/g, '')
        .toLowerCase()
      return rows.filter(
        (row) =>
          row.network_id === networkId &&
          ['address', 'title', 'description'].some((field) =>
            String(row[field] ?? '')
              .toLowerCase()
              .includes(needle)
          )
      )
    }

    const hasLimit = lower.includes('limit ? offset ?')
    const whereParams = hasLimit ? params.slice(0, -2) : params
    const wherePart = sql.split(/ where /i)[1].split(/ order by | limit /i)[0]
    const columns = [...wherePart.matchAll(/([a-z_]+)\s*=\s*\?/gi)].map((match) => match[1])

    return rows.filter((row) =>
      columns.every((column, index) => row[column] === whereParams[index])
    )
  }

  private async insertRows<T>(sql: string, params: unknown[], returning: boolean): Promise<T[]> {
    const insertMatch = sql.match(/^insert into ([a-z_]+) \((.+?)\) values/i)
    if (!insertMatch) {
      return []
    }

    const [, table, columnsPart] = insertMatch
    const columns = columnsPart.split(',').map((column) => column.trim())
    const rowCount = Math.max(1, Math.floor(params.length / columns.length))
    const insertedRows: Row[] = []
    const rows = (storybookTables[table] = storybookTables[table] ?? [])

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const row: Row = {}
      columns.forEach((column, columnIndex) => {
        row[column] = params[rowIndex * columns.length + columnIndex]
      })

      const primaryKey = getPrimaryKey(table)
      if (row[primaryKey] == null && primaryKey !== 'url') {
        row[primaryKey] = nextId(table, primaryKey)
      }
      if (row.id == null && primaryKey !== 'id' && primaryKey !== 'url') {
        row.id = row[primaryKey]
      }

      rows.push(row)
      insertedRows.push(row)
    }

    return returning ? (insertedRows.map(cloneRow) as T[]) : (insertedRows as T[])
  }
}

export const mockDb = new MockDatabase()
export const DbContext = createContext<MockDatabase>(mockDb)
export const useDatabase = () => useContext(DbContext)
export async function InitDB() {}
export async function getDatabase() {
  return mockDb
}
