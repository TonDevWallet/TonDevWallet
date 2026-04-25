import { Buffer } from 'buffer'
import { createContext, useContext } from 'react'

type Row = Record<string, any>
type Predicate = (row: Row) => boolean

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
      encrypted: JSON.stringify({ cypher: 'encrypted-scrypt-tweetnacl', salt: 'storybook', N: 1, r: 1, p: 1 }),
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

function nextId(table: string, key = 'id') {
  const rows = storybookTables[table] ?? []
  return rows.reduce((max, row) => Math.max(max, Number(row[key] ?? row.id ?? 0)), 0) + 1
}

function cloneRow(row: Row) {
  return { ...row }
}

class QueryBuilder {
  private predicates: Predicate[] = []
  private lastInserted: Row[] | undefined
  private take: number | undefined
  private skip = 0
  private countMode = false

  constructor(private table: string) {}

  where(arg: string | Row | ((builder: QueryBuilder) => void), value?: unknown) {
    if (typeof arg === 'function') {
      arg(this)
      return this
    }
    if (typeof arg === 'string') {
      this.predicates.push((row) => row[arg] === value)
      return this
    }
    this.predicates.push((row) => Object.entries(arg).every(([key, val]) => row[key] === val))
    return this
  }

  whereRaw() {
    return this
  }

  orWhereRaw() {
    return this
  }

  select() {
    return this
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    const factor = direction === 'desc' ? -1 : 1
    const data = storybookTables[this.table] ?? []
    data.sort((a, b) => (a[field] > b[field] ? factor : a[field] < b[field] ? -factor : 0))
    return this
  }

  limit(size: number) {
    this.take = size
    return this
  }

  offset(size: number) {
    this.skip = size
    return this
  }

  count() {
    this.countMode = true
    return this
  }

  insert(payload: Row | Row[]) {
    const rows = Array.isArray(payload) ? payload : [payload]
    const tableRows = (storybookTables[this.table] = storybookTables[this.table] ?? [])
    const primaryKey = this.table === 'address_book' ? 'address_book_id' : 'id'
    this.lastInserted = rows.map((row) => {
      const withId = { ...row }
      if (withId[primaryKey] == null && withId.id == null) {
        withId[primaryKey] = nextId(this.table, primaryKey)
      }
      if (withId.id == null && primaryKey !== 'id') {
        withId.id = withId[primaryKey]
      }
      tableRows.push(withId)
      return cloneRow(withId)
    })
    return this
  }

  returning() {
    return Promise.resolve(this.lastInserted ?? this.rows())
  }

  onConflict() {
    return this
  }

  merge() {
    return Promise.resolve(this.lastInserted ?? this.rows())
  }

  async update(arg: Row | string, value?: unknown) {
    const update = typeof arg === 'string' ? { [arg]: value } : arg
    let changed = 0
    for (const row of storybookTables[this.table] ?? []) {
      if (this.predicates.every((predicate) => predicate(row))) {
        Object.assign(row, update)
        changed += 1
      }
    }
    return changed
  }

  async delete() {
    const data = storybookTables[this.table] ?? []
    const keep = data.filter((row) => !this.predicates.every((predicate) => predicate(row)))
    const deleted = data.length - keep.length
    storybookTables[this.table] = keep
    return deleted
  }

  async first() {
    if (this.countMode) {
      return { count: this.rows().length }
    }
    return this.rows()[0]
  }

  private rows() {
    const rows = (storybookTables[this.table] ?? [])
      .filter((row) => this.predicates.every((predicate) => predicate(row)))
      .slice(this.skip, this.take == null ? undefined : this.skip + this.take)
      .map(cloneRow)
    return this.countMode ? [{ count: rows.length }] : rows
  }

  then(resolve: (value: Row[]) => void, reject?: (reason?: unknown) => void) {
    return Promise.resolve(this.rows()).then(resolve, reject)
  }
}

function createMockDb() {
  const db = ((table: string) => new QueryBuilder(table)) as any

  db.raw = async (sql: string, params: unknown[] = []) => {
    const normalized = sql.trim().toLowerCase()
    if (normalized.startsWith('insert into keys')) {
      const [publicKey, name, signType] = params
      return new QueryBuilder('keys')
        .insert({ public_key: publicKey, name, sign_type: signType, encrypted: null })
        .returning('*')
    }
    return []
  }

  db.transaction = async (callback?: (tx: any) => Promise<void>) => {
    const tx = Object.assign(createMockDb(), {
      commit: async () => undefined,
      rollback: async () => undefined,
      isCompleted: () => true,
    })
    if (callback) {
      await callback(tx)
    }
    return tx
  }

  return db
}

export const mockDb = createMockDb()
export const DbContext = createContext<any>(mockDb)
export const useDatabase = () => useContext(DbContext)
export async function InitDB() {}
export async function getDatabase() {
  return mockDb
}
