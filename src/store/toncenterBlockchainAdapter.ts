/**
 * Primary chain client backed by [TON Center HTTP API v3](https://toncenter.com/api/v3/doc.json).
 */
/* eslint-disable camelcase */
import {
  Address,
  Cell,
  Contract,
  ContractState,
  OpenedContract,
  TupleItem,
  TupleReader,
  openContract,
} from '@ton/core'
// import { fetch as tFetch } from '@tauri-apps/plugin-http'
// eslint-disable-next-line camelcase
import { liteServer_masterchainInfo } from 'ton-lite-client/dist/schema'
import { CallForSuccess } from '@/utils/callForSuccess'
import type {
  BlockRef,
  AccountState,
  ApiClient,
  ShardQuery,
  ShardsResponse,
} from './primaryChainClient'
import type { BlockchainStorage } from '@ton/sandbox/dist/blockchain/BlockchainStorage'
import { ToncenterBlockchainStorage } from '@/utils/toncenterBlockchainStorage'
import { toncenterV3RequestHeaders } from '@/utils/ton'

function parseBocField(data: string | undefined): Cell | undefined {
  if (!data?.trim()) return undefined
  const s = data.trim()
  if (/^[0-9a-fA-F]+$/.test(s)) {
    return Cell.fromHex(s)
  }
  return Cell.fromBase64(s)
}

type ToncenterBlockJson = {
  workchain: number
  shard: string
  seqno: number
  root_hash?: string
  file_hash?: string
}

type AccountStateFullJson = {
  address?: string
  balance?: string
  status?: string
  code_boc?: string
  data_boc?: string
  extra_currencies?: Record<string, string>
  frozen_hash?: string
  last_transaction_lt?: string
  last_transaction_hash?: string
}

type V2StackRecord = {
  type: string
  cell?: string
  value?: string
  tuple?: V2StackRecord[]
}

function tvmStackToTupleItems(stack: V2StackRecord[]): TupleItem[] {
  return stack.map((item) => {
    const t = item.type?.toLowerCase()
    if (t === 'num' && item.value !== undefined && item.value !== '') {
      return { type: 'int' as const, value: BigInt(item.value) }
    }
    if (t === 'cell' && item.value) {
      const cell = Cell.fromBase64(item.value)
      return { type: 'cell' as const, cell }
    }
    if (t === 'slice' && item.value) {
      const cell = Cell.fromBase64(item.value)
      return { type: 'slice' as const, cell }
    }
    if (t === 'null') {
      return { type: 'null' as const }
    }
    if (t === 'nan') {
      return { type: 'nan' as const }
    }
    if (t === 'tuple' && item.tuple) {
      return { type: 'tuple' as const, items: tvmStackToTupleItems(item.tuple) }
    }
    return { type: 'null' as const }
  })
}

function tupleItemToV2Stack(item: TupleItem): { type: string; value?: string } {
  if (item.type === 'int') {
    return { type: 'num', value: item.value.toString(10) }
  }
  if (item.type === 'cell') {
    return { type: 'cell', value: item.cell.toBoc().toString('base64') }
  }
  if (item.type === 'slice') {
    return { type: 'slice', value: item.cell.toBoc().toString('base64') }
  }
  if (item.type === 'null') {
    return { type: 'null' }
  }
  if (item.type === 'nan') {
    return { type: 'nan' }
  }
  if (item.type === 'tuple') {
    throw new Error('TonCenter runGetMethod: nested tuples are not supported')
  }
  return { type: 'null' }
}

function accountRowToPrimaryState(row: AccountStateFullJson): AccountState {
  const balStr = row.balance ?? '0'
  const coins = BigInt(balStr)
  const other: Record<number, bigint> = {}
  if (row.extra_currencies) {
    for (const [k, v] of Object.entries(row.extra_currencies)) {
      const id = Number(k)
      if (!Number.isNaN(id)) {
        other[id] = BigInt(v)
      }
    }
  }
  const status = row.status ?? 'uninit'
  let dataCell: Cell | undefined
  let codeCell: Cell | undefined
  if (status === 'active') {
    dataCell = parseBocField(row.data_boc)
    codeCell = parseBocField(row.code_boc)
  }
  return {
    balance: { coins, other: Object.keys(other).length ? other : undefined },
    state:
      dataCell && codeCell
        ? {
            storage: {
              state: {
                type: 'active',
                state: { data: dataCell, code: codeCell },
              },
            },
          }
        : undefined,
  }
}

function accountRowToContractState(row: AccountStateFullJson): ContractState {
  const balance = BigInt(row.balance ?? '0')
  const lastLt = row.last_transaction_lt ? BigInt(row.last_transaction_lt) : null
  const lastHash = row.last_transaction_hash
    ? Buffer.from(row.last_transaction_hash, 'base64')
    : null
  const last =
    lastLt !== null && lastHash !== null
      ? {
          lt: lastLt,
          hash: lastHash,
        }
      : null

  const status = row.status ?? 'uninit'
  if (status === 'uninit' || !row.code_boc) {
    return { balance, extracurrency: null, last, state: { type: 'uninit' } }
  }
  if (status === 'frozen' && row.frozen_hash) {
    return {
      balance,
      extracurrency: null,
      last,
      state: {
        type: 'frozen',
        stateHash: Buffer.from(row.frozen_hash, 'base64'),
      },
    }
  }
  try {
    const code = parseBocField(row.code_boc)
    const data = parseBocField(row.data_boc)
    if (!code || !data) {
      return { balance, extracurrency: null, last, state: { type: 'uninit' } }
    }
    return {
      balance,
      extracurrency: null,
      last,
      state: {
        type: 'active',
        code: Buffer.from(code.toBoc().slice(2)),
        data: Buffer.from(data.toBoc().slice(2)),
      },
    }
  } catch {
    return { balance, extracurrency: null, last, state: { type: 'uninit' } }
  }
}

function blockToBlockIdExt(b: ToncenterBlockJson) {
  const rootB64 = b.root_hash ?? ''
  const fileB64 = b.file_hash ?? ''
  return {
    kind: 'tonNode.blockIdExt' as const,
    workchain: b.workchain,
    shard: b.shard,
    seqno: b.seqno,
    rootHash: rootB64 ? Buffer.from(rootB64, 'base64') : Buffer.alloc(32),
    fileHash: fileB64 ? Buffer.from(fileB64, 'base64') : Buffer.alloc(32),
  }
}

export class ToncenterBlockchainAdapter implements ApiClient {
  private readonly _baseUrl: string
  private readonly _apiKey?: string

  constructor(baseUrl: string, apiKey?: string) {
    this._baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    this._apiKey = apiKey?.trim() || undefined
  }

  get baseUrl(): string {
    return this._baseUrl
  }

  private url(pathAndQuery: string): string {
    const p = pathAndQuery.startsWith('/') ? pathAndQuery.slice(1) : pathAndQuery
    return `${this._baseUrl}${p}`
  }

  private requestHeaders(): Record<string, string> {
    return toncenterV3RequestHeaders(this._apiKey)
  }

  private async parseJsonResponse(res: Response): Promise<unknown> {
    const text = await res.text()
    let json: unknown
    try {
      json = text ? JSON.parse(text) : {}
    } catch {
      throw new Error(`TonCenter: invalid JSON (${res.status})`)
    }
    const err = json as { error?: string }
    if (!res.ok || (typeof err?.error === 'string' && err.error.length > 0)) {
      throw new Error(err?.error || `TonCenter HTTP ${res.status}`)
    }
    return json
  }

  /** Used by {@link ToncenterContractProvider} and adapter methods. */
  async getJson<T>(pathAndQuery: string): Promise<T> {
    const res = await fetch(this.url(pathAndQuery), {
      method: 'GET',
      headers: this.requestHeaders(),
    })
    return (await this.parseJsonResponse(res)) as T
  }

  async postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(this.url(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.requestHeaders(),
      },
      body: JSON.stringify(body),
    })
    return (await this.parseJsonResponse(res)) as T
  }

  async getAccountState(
    address: Address,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- liteserver block id; Ton Center serves latest indexed state
    _block?: BlockRef
  ): Promise<AccountState> {
    const addrParam = encodeURIComponent(address.toString())
    const data = await CallForSuccess(
      () =>
        this.getJson<{ accounts?: AccountStateFullJson[] }>(
          `accountStates?address=${addrParam}&include_boc=true`
        ),
      20,
      500
    )
    const row = data.accounts?.[0]
    if (!row) {
      return {
        balance: { coins: 0n },
        state: undefined,
      }
    }
    return accountRowToPrimaryState(row)
  }

  async getMasterchainInfo(): Promise<liteServer_masterchainInfo> {
    // const data = await CallForSuccess(
    //   () =>
    //     this.getJson<{ last: ToncenterBlockJson; first?: ToncenterBlockJson }>('masterchainInfo'),
    //   20,
    //   500
    // )
    // const last = data.last
    return {
      kind: 'liteServer.masterchainInfo',
      last: {
        fileHash: Buffer.alloc(32),
        rootHash: Buffer.alloc(32),
        seqno: 0,
        shard: '8000000000000000',
        workchain: -1,
        kind: 'tonNode.blockIdExt',
      }, // blockToBlockIdExt(last),
      stateRootHash: Buffer.alloc(32),
      init: {
        kind: 'tonNode.zeroStateIdExt',
        workchain: -1,
        rootHash: Buffer.alloc(32),
        fileHash: Buffer.alloc(32),
      },
    }
  }

  open<T extends Contract>(contract: T): OpenedContract<T> {
    const address = contract.address
    const provider = new ToncenterContractProvider(address, this)
    return provider.open(contract)
  }

  async sendMessage(boc: Buffer): Promise<{ status: number }> {
    const bocBase64 = boc.toString('base64')
    await CallForSuccess(() => this.postJson<unknown>('message', { boc: bocBase64 }), 20, 500)
    return { status: 1 }
  }

  async getAllShardsInfo(block: ShardQuery): Promise<ShardsResponse> {
    // const seqno = block.seqno
    // const data = await CallForSuccess(
    //   () =>
    //     this.getJson<{ transactions?: { block_ref?: ToncenterBlockJson }[] }>(
    //       `masterchainBlockShards?seqno=${seqno}&limit=1000&offset=0`
    //     ),
    //   20,
    //   500
    // )
    // const shards: { [workchain: string]: { [shard: string]: number } } = {}
    // for (const tx of data.transactions ?? []) {
    //   const ref = tx.block_ref
    //   if (!ref) continue
    //   const wc = String(ref.workchain)
    //   const shard = ref.shard ?? '8000000000000000'
    //   if (!shards[wc]) shards[wc] = {}
    //   const prev = shards[wc][shard] ?? -1
    //   if (ref.seqno > prev) {
    //     shards[wc][shard] = ref.seqno
    //   }
    // }
    return {
      id: {
        seqno: block.seqno,
        shard: String(block.shard ?? '8000000000000000'),
        workchain: block.workchain ?? -1,
      },
      shards: {},
    }
  }

  async getLibraries(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- no library endpoint in Ton Center v3 OpenAPI
    _hashes: Buffer[]
  ): Promise<{ result: { hash: Buffer; data: Buffer }[] }> {
    // No library-by-hash endpoint in Ton Center v3 OpenAPI (see doc.json).
    return { result: [] }
  }

  createStorageAdapter(): BlockchainStorage {
    return new ToncenterBlockchainStorage(this)
  }
}

class ToncenterContractProvider {
  private readonly _address: Address
  private readonly _client: ToncenterBlockchainAdapter

  constructor(address: Address, client: ToncenterBlockchainAdapter) {
    this._address = address
    this._client = client
  }

  async getState(): Promise<ContractState> {
    const addrParam = encodeURIComponent(this._address.toString())
    const data = await CallForSuccess(
      () =>
        this._client.getJson<{ accounts?: AccountStateFullJson[] }>(
          `accountStates?address=${addrParam}&include_boc=true`
        ),
      20,
      500
    )
    const row = data.accounts?.[0]
    if (!row) {
      return {
        balance: 0n,
        extracurrency: null,
        last: null,
        state: { type: 'uninit' },
      }
    }
    return accountRowToContractState(row)
  }

  async get(name: string | number, args: TupleItem[]): Promise<{ stack: TupleReader }> {
    const methodName = typeof name === 'number' ? 'seqno' : String(name)
    const stack = args.map(tupleItemToV2Stack)
    const raw = await CallForSuccess(
      () =>
        this._client.postJson<{ exit_code: number; stack?: V2StackRecord[] }>('runGetMethod', {
          address: this._address.toRawString(),
          method: methodName,
          stack,
        }),
      20,
      500
    )
    if (raw.exit_code !== 0) {
      throw new Error(`Get method ${methodName} failed: exit_code ${raw.exit_code}`)
    }
    const items = tvmStackToTupleItems(raw.stack || [])
    return { stack: new TupleReader(items) }
  }

  async external(message: Cell): Promise<void> {
    const boc = message.toBoc().toString('base64')
    await CallForSuccess(() => this._client.postJson('message', { boc }), 20, 500)
  }

  async internal(): Promise<void> {
    throw new Error('ToncenterBlockchainAdapter does not support internal messages — use external')
  }

  open<T extends Contract>(contract: T): OpenedContract<T> {
    return openContract(contract, () => this)
  }

  async getTransactions(): Promise<never[]> {
    throw new Error('ToncenterBlockchainAdapter does not support getTransactions')
  }
}
