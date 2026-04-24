/**
 * Blockchain adapter using only tonapi-sdk-js (no LiteClient).
 * Implements ContractProvider for wallet operations and sendMessage for broadcasting.
 */
import {
  Address,
  Cell,
  Contract,
  ContractProvider,
  ContractState,
  OpenedContract,
  TupleItem,
  TupleReader,
  openContract,
} from '@ton/core'
import { Api } from 'tonapi-sdk-js'
import type { BlockchainStorage } from '@ton/sandbox/dist/blockchain/BlockchainStorage'
import { TonapiBlockchainStorage } from '@/utils/tonapiBlockchainStorage'
import { CallForSuccess } from '@/utils/callForSuccess'
// eslint-disable-next-line camelcase
import { liteServer_masterchainInfo } from 'ton-lite-client/dist/schema'
import type {
  BlockRef,
  AccountState,
  ApiClient,
  ShardQuery,
  ShardsResponse,
} from './primaryChainClient'

/** Parse cell from tonapi - handles both base64 and hex BOC format */
function parseTonapiCell(data: string): Cell {
  const hexRegex = /^[0-9a-fA-F]+$/
  if (hexRegex.test(data)) {
    return Cell.fromHex(data)
  }
  return Cell.fromBase64(data)
}

function parseLibraryCellByExpectedHash(data: string, expectedHash: Buffer): Cell {
  const candidates: { source: string; cell: Cell }[] = []
  const trimmed = data.trim()
  const expectedHex = expectedHash.toString('hex')
  const pushCandidate = (source: string, parse: () => Cell) => {
    try {
      candidates.push({ source, cell: parse() })
    } catch {
      // try next representation
    }
  }

  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    pushCandidate('hex-boc', () => Cell.fromBoc(Buffer.from(trimmed, 'hex'))[0])
    pushCandidate('hex-cell', () => Cell.fromHex(trimmed))
  }
  pushCandidate('base64-boc', () => Cell.fromBoc(Buffer.from(trimmed, 'base64'))[0])
  pushCandidate('base64-cell', () => Cell.fromBase64(trimmed))

  for (const candidate of candidates) {
    const hash = candidate.cell.hash().toString('hex')
    if (hash === expectedHex) {
      return candidate.cell
    }
  }

  const first = candidates[0]
  if (first) {
    return first.cell
  }

  throw new Error('Unable to parse library cell BOC')
}

type TvmStackRecord = {
  type: 'cell' | 'num' | 'nan' | 'null' | 'tuple'
  cell?: string
  slice?: string
  num?: string
  tuple?: TvmStackRecord[]
}

function tvmStackToTupleItems(stack: TvmStackRecord[]): TupleItem[] {
  return stack.map((item) => {
    if (item.type === 'num' && item.num !== undefined) {
      return { type: 'int' as const, value: BigInt(item.num) }
    }
    if (item.type === 'cell' && item.cell) {
      const cell = Cell.fromBase64(item.cell)
      return { type: 'cell' as const, cell }
    }
    if (item.type === 'null') {
      return { type: 'null' as const }
    }
    if (item.type === 'nan') {
      return { type: 'nan' as const }
    }
    if (item.type === 'tuple' && item.tuple) {
      return { type: 'tuple' as const, items: tvmStackToTupleItems(item.tuple) }
    }
    return { type: 'null' as const }
  })
}

function rawAccountToContractState(raw: {
  balance: number
  code?: string
  data?: string
  last_transaction_lt?: number
  last_transaction_hash?: string
  status?: string
}): ContractState {
  const balance = BigInt(raw.balance)
  const last =
    raw.last_transaction_lt && raw.last_transaction_hash
      ? {
          lt: BigInt(raw.last_transaction_lt),
          hash: Buffer.from(raw.last_transaction_hash, 'hex'),
        }
      : null

  if (raw.status === 'uninit' || !raw.code) {
    return { balance, extracurrency: null, last, state: { type: 'uninit' } }
  }
  if (raw.status === 'frozen' && raw.last_transaction_hash) {
    return {
      balance,
      extracurrency: null,
      last,
      state: { type: 'frozen', stateHash: Buffer.from(raw.last_transaction_hash, 'hex') },
    }
  }
  try {
    return {
      balance,
      extracurrency: null,
      last,
      state: {
        type: 'active',
        code: raw.code ? Buffer.from(parseTonapiCell(raw.code).toBoc().slice(2)) : null,
        data: raw.data ? Buffer.from(parseTonapiCell(raw.data).toBoc().slice(2)) : null,
      },
    }
  } catch {
    return { balance, extracurrency: null, last, state: { type: 'uninit' } }
  }
}

function tupleItemToTonapiArg(item: TupleItem): string {
  if (item.type === 'int') {
    return item.value.toString()
  }
  if (item.type === 'cell') {
    return item.cell.toBoc().toString('base64')
  }
  if (item.type === 'slice') {
    return item.cell.toBoc().toString('base64')
  }
  if (item.type === 'null') return 'Null'
  if (item.type === 'nan') return 'NaN'
  if (item.type === 'tuple') {
    return '[' + item.items.map(tupleItemToTonapiArg).join(',') + ']'
  }
  return 'Null'
}

export class TonapiContractProvider implements ContractProvider {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    private address: Address,
    private api: Api<unknown>,
    private init: { code: Cell | null; data: Cell | null } | null
  ) {}

  async getState(): Promise<ContractState> {
    const raw = await CallForSuccess(
      () => (this.api as any).blockchain.getBlockchainRawAccount(this.address.toString()),
      20,
      500
    )
    return rawAccountToContractState(raw)
  }

  async get(name: string | number, args: TupleItem[]): Promise<{ stack: TupleReader }> {
    const methodName = typeof name === 'number' ? 'seqno' : String(name)
    const argsStr = args.map(tupleItemToTonapiArg)
    const result = await CallForSuccess(
      () =>
        (this.api as any).blockchain.execGetMethodForBlockchainAccount(
          this.address.toString(),
          methodName,
          { args: argsStr }
        ),
      20,
      500
    )
    if (!result.success) {
      throw new Error(`Get method ${methodName} failed: exit_code ${result.exit_code}`)
    }
    const items = tvmStackToTupleItems(result.stack || [])
    return { stack: new TupleReader(items) }
  }

  async external(message: Cell): Promise<void> {
    const boc = message.toBoc().toString('base64')
    await CallForSuccess(() => (this.api as any).blockchain.sendBlockchainMessage({ boc }), 20, 500)
  }

  async internal(): Promise<void> {
    throw new Error('TonapiBlockchainAdapter does not support internal messages - use external')
  }

  open<T extends Contract>(contract: T): OpenedContract<T> {
    return openContract(contract, () => this)
  }

  async getTransactions(): Promise<never[]> {
    throw new Error('TonapiBlockchainAdapter does not support getTransactions')
  }
}

/** Alias for {@link AccountState} (TonAPI-backed rows). */
export type TonapiAccountState = AccountState

/**
 * Adapter that provides open(), sendMessage(), getAccountState, getMasterchainInfo
 * using only tonapi-sdk-js.
 */
export class TonapiBlockchainAdapter implements ApiClient {
  // eslint-disable-next-line no-useless-constructor
  constructor(private api: Api<unknown>) {}

  async getAccountState(
    address: Address,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- liteserver block id; TonAPI ignores it
    _block?: BlockRef
  ): Promise<AccountState> {
    const raw = await CallForSuccess(
      () => (this.api as any).blockchain.getBlockchainRawAccount(address.toString()),
      20,
      500
    )
    const other: Record<number, bigint> = {}
    if (raw.extra_balance) {
      for (const eb of raw.extra_balance) {
        other[eb.id] = BigInt(eb.value)
      }
    }
    let dataCell: Cell | undefined
    let codeCell: Cell | undefined
    if (raw.data && (raw.status === 'active' || (raw as any).status === 1)) {
      try {
        dataCell = parseTonapiCell(raw.data)
      } catch {
        // Ignore parse errors - balance still works without state data
      }
    }
    if (raw.code && (raw.status === 'active' || (raw as any).status === 1)) {
      try {
        codeCell = parseTonapiCell(raw.code)
      } catch {
        // Ignore
      }
    }

    return {
      balance: { coins: BigInt(raw.balance), other: Object.keys(other).length ? other : undefined },
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

  // eslint-disable-next-line camelcase
  async getMasterchainInfo(): Promise<liteServer_masterchainInfo> {
    const head = await CallForSuccess(
      () => (this.api as any).blockchain.getBlockchainMasterchainHead(),
      20,
      500
    )
    return {
      kind: 'liteServer.masterchainInfo',
      last: {
        kind: 'tonNode.blockIdExt',
        seqno: head.seqno ?? 0,
        shard: head.shard ?? '8000000000000000',
        workchain: head.workchain_id ?? -1,

        rootHash: Buffer.alloc(32), // TODO: add root hash
        fileHash: Buffer.alloc(32), // TODO: add file hash
      },

      stateRootHash: Buffer.alloc(32), // TODO: add state root hash
      init: {
        kind: 'tonNode.zeroStateIdExt',
        workchain: -1,
        rootHash: Buffer.alloc(32), // TODO: add root hash
        fileHash: Buffer.alloc(32), // TODO: add file hash
      },
    }
  }

  open<T extends Contract>(contract: T): OpenedContract<T> {
    const address = contract.address
    const init = contract.init
    const provider = new TonapiContractProvider(
      address,
      this.api,
      init ? { code: init.code ?? null, data: init.data ?? null } : null
    )
    return provider.open(contract)
  }

  async sendMessage(boc: Buffer): Promise<{ status: number }> {
    const bocBase64 = boc.toString('base64')
    await CallForSuccess(
      () => (this.api as any).blockchain.sendBlockchainMessage({ boc: bocBase64 }),
      20,
      500
    )
    return { status: 1 }
  }

  /** Get shards info for emulation - converts tonapi format to AllShardsResponse-like */
  async getAllShardsInfo(block: ShardQuery): Promise<ShardsResponse> {
    const shardsData = await CallForSuccess(
      () => (this.api as any).blockchain.getBlockchainMasterchainShards(block.seqno),
      20,
      500
    )
    const shards: { [key: string]: { [key: string]: number } } = {}
    for (const s of shardsData.shards || []) {
      const blk = s.last_known_block
      if (blk) {
        const wc = String(blk.workchain_id ?? 0)
        const shard = blk.shard ?? '8000000000000000'
        if (!shards[wc]) shards[wc] = {}
        shards[wc][shard] = blk.seqno ?? 0
      }
    }
    return {
      id: { seqno: block.seqno, shard: '8000000000000000', workchain: -1 },
      shards,
    }
  }

  /** Get library by hash for emulation */
  async getLibraries(hashes: Buffer[]): Promise<{ result: { hash: Buffer; data: Buffer }[] }> {
    const result: { hash: Buffer; data: Buffer }[] = []
    for (const hash of hashes) {
      try {
        const lib = await CallForSuccess(
          () => (this.api as any).blockchain.getLibraryByHash(hash.toString('hex')),
          20,
          500
        )
        if (lib?.boc) {
          const cell = parseLibraryCellByExpectedHash(lib.boc, hash)
          result.push({ hash, data: Buffer.from(cell.toBoc()) })
        }
      } catch (e) {
        // silent
      }
    }
    return { result }
  }

  createStorageAdapter(): BlockchainStorage {
    return new TonapiBlockchainStorage(this)
  }
}
