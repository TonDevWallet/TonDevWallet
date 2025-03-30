import { Buffer } from 'buffer'
import {
  AccountState,
  Address,
  Cell,
  ShardAccount,
  Transaction,
  OutAction,
  Builder,
  Slice,
  OutActionReserve,
  loadOutList,
} from '@ton/core'
import { TonClient } from '@ton/ton'
import { LiteClient } from 'ton-lite-client'
import { CallForSuccess } from '../callForSuccess'

export type StateFromAPI =
  | {
      type: 'uninit'
    }
  | {
      data: string | null
      code: string | null
      type: 'active'
    }
  | {
      type: 'frozen'
      stateHash: string
    }

export type AccountFromAPI = {
  balance: {
    coins: string
  }
  state: StateFromAPI
  last: {
    lt: string
    hash: string
  } | null
  storageStat: {
    lastPaid: number
    duePayment: string | null
    used: {
      bits: number
      cells: number
      publicCells: number
    }
  } | null
}

export type StackElement =
  | bigint
  | Cell
  | Slice
  | Builder
  | Address
  | null
  | undefined
  | string
  | any[]

// runner return types
export type TVMLog = {
  instruction: string
  price: number | undefined
  gasRemaining: number
  error?: { code: number; text: string }
  stackAfter: StackElement[]
}

export type TxLinks = {
  toncx: string
  tonviewer: string
  tonscan: string
  toncoin: string
  dton: string
}

export type ComputeInfo =
  | 'skipped'
  | {
      success: boolean
      exitCode: number
      vmSteps: number
      gasUsed: bigint
      gasFees: bigint
    }

export type EmulateWithStackResult = {
  sender: Address | undefined | null
  contract: Address
  amount: bigint | undefined
  utime: number
  lt: bigint
  money: {
    balanceBefore: bigint
    sentTotal: bigint
    totalFees: bigint
    balanceAfter: bigint
  }
  computeInfo: ComputeInfo
  computeLogs: TVMLog[]
  stateUpdateHashOk: boolean
  executorLogs: string
  emulatorVersion: {
    commitHash: string
    commitDate: string
  }
  links: TxLinks
  actions: OutAction[]
}

// Indexer v3 API types
export interface TransactionIndexed {
  account: string
  hash: string
  lt: string
  now: number
  orig_status: 'uninit' | 'frozen' | 'active' | 'nonexist'
  end_status: 'uninit' | 'frozen' | 'active' | 'nonexist'
  total_fees: string
  prev_trans_hash: string
  prev_trans_lt: string
  description: string
  block_ref: {
    workchain: number
    shard: string
    seqno: number
  }
  in_msg: {
    hash: string
    source: string
    destination: string
    value: string
    fwd_fee: string
    ihr_fee: string
    created_lt: string
    created_at: string
    opcode: string
    ihr_disabled: boolean
    bounce: boolean
    bounced: boolean
    import_fee: string
    message_content: {
      hash: string
      body: string
      decoded: Record<string, unknown>
    }
    init_state: {
      hash: string
      body: string
    }
  }
  out_msgs: {
    hash: string
    source: string
    destination: string
    value: string
    fwd_fee: string
    ihr_fee: string
    created_lt: string
    created_at: string
    opcode: string
    ihr_disabled: boolean
    bounce: boolean
    bounced: boolean
    import_fee: string
    message_content: {
      hash: string
      body: string
      decoded: Record<string, unknown>
    }
    init_state: {
      hash: string
      body: string
    }
  }[]
  account_state_before: {
    hash: string
    balance: string
    account_status: 'uninit' | 'frozen' | 'active' | 'nonexist'
    frozen_hash: string
    code_hash: string
    data_hash: string
  } | null
  account_state_after: {
    hash: string
    balance: string
    account_status: 'uninit' | 'frozen' | 'active' | 'nonexist'
    frozen_hash: string
    code_hash: string
    data_hash: string
  } | null
  mc_block_seqno: number | null
}

export interface AddressBookEntry {
  user_friendly: string
}

export interface TransactionList {
  transactions: TransactionIndexed[]
  address_book: Record<string, AddressBookEntry>
}

export interface GetTransactionsParams {
  workchain?: number | null
  shard?: string | null
  seqno?: number | null
  account?: string[]
  exclude_account?: string[]
  hash?: string | null
  lt?: number | null
  start_utime?: number | null
  end_utime?: number | null
  start_lt?: number | null
  end_lt?: number | null
  limit?: number
  offset?: number
  sort?: 'asc' | 'desc'
}
export type BaseTxInfo = { lt: bigint; hash: Buffer; addr: Address }

export async function fetchTransactions(
  params: GetTransactionsParams,
  testnet: boolean
): Promise<TransactionList> {
  try {
    const url = new URL(`https://${testnet ? 'testnet.' : ''}toncenter.com/api/v3/transactions`)

    // Add all parameters to URL search params
    if (params.workchain !== null && params.workchain !== undefined)
      url.searchParams.append('workchain', params.workchain.toString())
    if (params.shard !== null && params.shard !== undefined)
      url.searchParams.append('shard', params.shard)
    if (params.seqno !== null && params.seqno !== undefined)
      url.searchParams.append('seqno', params.seqno.toString())
    if (params.hash !== null && params.hash !== undefined)
      url.searchParams.append('hash', params.hash)
    if (params.lt !== null && params.lt !== undefined)
      url.searchParams.append('lt', params.lt.toString())
    if (params.account) {
      params.account.forEach((acc) => url.searchParams.append('account', acc))
    }
    if (params.exclude_account) {
      params.exclude_account.forEach((acc) => url.searchParams.append('exclude_account', acc))
    }
    if (params.start_utime !== null && params.start_utime !== undefined)
      url.searchParams.append('start_utime', params.start_utime.toString())
    if (params.end_utime !== null && params.end_utime !== undefined)
      url.searchParams.append('end_utime', params.end_utime.toString())
    if (params.start_lt !== null && params.start_lt !== undefined)
      url.searchParams.append('start_lt', params.start_lt.toString())
    if (params.end_lt !== null && params.end_lt !== undefined)
      url.searchParams.append('end_lt', params.end_lt.toString())
    if (params.limit !== undefined) url.searchParams.append('limit', params.limit.toString())
    if (params.offset !== undefined) url.searchParams.append('offset', params.offset.toString())
    if (params.sort !== undefined) url.searchParams.append('sort', params.sort)

    const data = await CallForSuccess(
      async () => {
        const res = await fetch(url.toString())
        if (res.status !== 200) {
          throw new Error('Failed to fetch transactions')
        }
        return res.json()
      },
      50,
      250
    )
    return data as TransactionList
  } catch (error) {
    console.error('Error fetching transactions:', error)
    throw error
  }
}

export async function mcSeqnoByShard(
  shard: {
    workchain: number
    seqno: number
    shard: string
    rootHash: string
    fileHash: string
  },
  testnet: boolean
): Promise<{
  mcSeqno: number
  randSeed: Buffer
}> {
  try {
    const shardInt = BigInt(shard.shard)
    const shardUint = shardInt < 0 ? shardInt + BigInt('0x10000000000000000') : shardInt

    const url = new URL(`https://${testnet ? 'testnet.' : ''}toncenter.com/api/v3/blocks`)
    url.searchParams.append('workchain', shard.workchain.toString())
    url.searchParams.append('shard', '0x' + shardUint.toString(16))
    url.searchParams.append('seqno', shard.seqno.toString())

    const response = await CallForSuccess(async () => {
      console.log('mcSeqnoByShard work')
      const res = await fetch(url.toString())
      if (res.status !== 200) {
        throw new Error('Failed to fetch mc_seqno')
      }
      return res.json()
    })
    const block = response.blocks[0]
    if (block.root_hash !== shard.rootHash) {
      throw new Error(
        'rootHash mismatch in mc_seqno getter: ' + shard.rootHash + ' != ' + block.root_hash
      )
    }

    return {
      mcSeqno: block.masterchain_block_ref.seqno,
      randSeed: Buffer.from(block.rand_seed, 'base64'),
    }
  } catch (error) {
    console.error('Error fetching mc_seqno:', error)
    throw error
  }
}

export async function getLib(
  liteClient: LiteClient,
  libhash: string
  // testnet: boolean
): Promise<Cell> {
  // gets a library by its hash from dton's graphql
  // const dtonEndpoint = `https://${testnet ? 'testnet.' : ''}dton.io/graphql`
  // const graphqlQuery = {
  //   query: `
  //         query fetchAuthor {
  //             get_lib(lib_hash: "${libhash}")
  //         }
  //     `,
  //   variables: {},
  // }
  try {
    const libData = await liteClient.getLibraries([Buffer.from(libhash, 'hex')])
    // const res = await axios.post(dtonEndpoint, graphqlQuery, {
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    // })
    // const libB64 = res.data.data.get_lib
    // return libData.result[0].data
    const lib = libData.result[0]
    return Cell.fromBoc(lib.data)[0]
  } catch (error) {
    console.error('Error fetching library:', error)
    throw error
  }
}

export async function linkToTx(
  txLink: string,
  forcedTestnet?: boolean
): Promise<{ tx: BaseTxInfo; testnet: boolean }> {
  // break given tx link to lt, hash, addr

  let lt: bigint, hash: Buffer, addr: Address
  let testnet: boolean

  if (txLink.startsWith('https://ton.cx/tx/') || txLink.startsWith('https://testnet.ton.cx/tx/')) {
    // example:
    // https://ton.cx/tx/47670702000009:Pl9JeY3iOdpdj4C03DACBNN2E+QgOj97h3wEqIyBhWs=:EQDa4VOnTYlLvDJ0gZjNYm5PXfSmmtL6Vs6A_CZEtXCNICq_
    testnet = forcedTestnet || txLink.includes('testnet.')
    const infoPart = testnet ? txLink.slice(26) : txLink.slice(18)
    const [ltStr, hashStr, addrStr] = infoPart.split(':')
    lt = BigInt(ltStr)
    hash = Buffer.from(hashStr, 'base64')
    addr = Address.parse(addrStr)
  } else if (
    txLink.startsWith('https://tonviewer.com/') ||
    txLink.startsWith('https://testnet.tonviewer.com/')
  ) {
    // example:
    // https://tonviewer.com/transaction/3e5f49798de239da5d8f80b4dc300204d37613e4203a3f7b877c04a88c81856b
    testnet = forcedTestnet || txLink.includes('testnet.')
    const infoPart = testnet ? txLink.slice(42) : txLink.slice(34)
    const res = await fetchTransactions({ hash: infoPart, limit: 1 }, testnet)
    hash = Buffer.from(infoPart, 'hex')
    addr = Address.parseRaw(res.transactions[0].account)
    lt = BigInt(res.transactions[0].lt)
  } else if (
    txLink.startsWith('https://tonscan.org/tx/') ||
    txLink.startsWith('https://testnet.tonscan.org/tx/')
  ) {
    // example:
    // https://tonscan.org/tx/Pl9JeY3iOdpdj4C03DACBNN2E+QgOj97h3wEqIyBhWs=
    testnet = forcedTestnet || txLink.includes('testnet.')
    const infoPart = testnet ? txLink.slice(31) : txLink.slice(23)
    const res = await fetchTransactions({ hash: infoPart, limit: 1 }, testnet)
    hash = Buffer.from(infoPart, 'base64')
    addr = Address.parseRaw(res.transactions[0].account)
    lt = BigInt(res.transactions[0].lt)
  } else if (
    txLink.startsWith('https://explorer.toncoin.org/transaction') ||
    txLink.startsWith('https://test-explorer.toncoin.org/transaction')
  ) {
    // example:
    // https://explorer.toncoin.org/transaction?account=EQDa4VOnTYlLvDJ0gZjNYm5PXfSmmtL6Vs6A_CZEtXCNICq_&lt=47670702000009&hash=3e5f49798de239da5d8f80b4dc300204d37613e4203a3f7b877c04a88c81856b
    testnet = forcedTestnet || txLink.includes('test-')
    const url = new URL(txLink)
    lt = BigInt(url.searchParams.get('lt') || '0')
    hash = Buffer.from(url.searchParams.get('hash') || '', 'hex')
    addr = Address.parse(url.searchParams.get('account') || '')
  } else if (
    txLink.startsWith('https://dton.io/tx') ||
    txLink.startsWith('https://testnet.dton.io/tx')
  ) {
    // example:
    // https://dton.io/tx/F64C6A3CDF3FAD1D786AACF9A6130F18F3F76EEB71294F53BBD812AD3703E70A
    testnet = forcedTestnet || txLink.includes('testnet.')
    const infoPart = testnet ? txLink.slice(27) : txLink.slice(19)
    const res = await fetchTransactions({ hash: infoPart, limit: 1 }, testnet)
    hash = Buffer.from(infoPart, 'hex')
    addr = Address.parseRaw(res.transactions[0].account)
    lt = BigInt(res.transactions[0].lt)
  } else {
    try {
      // (copied from ton.cx lt and hash field)
      // example:
      // 47670702000009:3e5f49798de239da5d8f80b4dc300204d37613e4203a3f7b877c04a88c81856b
      const [ltStr, hashStr] = txLink.split(':')
      lt = BigInt(ltStr)
      hash = Buffer.from(hashStr, 'hex')

      // first try mainnet.
      // if get transaction failed, try testnet
      let res: TransactionList
      testnet = forcedTestnet || false

      if (forcedTestnet) res = await fetchTransactions({ hash: hashStr, limit: 1 }, forcedTestnet)
      else
        try {
          res = await fetchTransactions({ hash: hashStr, limit: 1 }, testnet)
          if (res.transactions.length === 0) throw new Error('No transactions found')
        } catch {
          console.log(`Trying testnet for ${hashStr}...`)
          testnet = true
          await waitForRateLimit()
          res = await fetchTransactions({ hash: hashStr, limit: 1 }, testnet)
          if (res.transactions.length === 0) throw new Error('No transactions found')
        }
      addr = Address.parseRaw(res.transactions[0].account)
    } catch (e) {
      console.log('Trying hash formats...')
      try {
        if (txLink.endsWith('=')) {
          // convert base64 to hex (if base64)
          txLink = Buffer.from(txLink, 'base64').toString('hex')
        }

        if (txLink.length !== 64) throw new Error('Not hash')

        // (just hash)
        // examples:
        // fyGURCMaAmBYVk39QcE/ToX7zQUVA2cyRsO6/U52HW8=
        // 3e5f49798de239da5d8f80b4dc300204d37613e4203a3f7b877c04a88c81856b
        let res: TransactionList
        testnet = forcedTestnet || false

        await waitForRateLimit()
        if (forcedTestnet) res = await fetchTransactions({ hash: txLink, limit: 1 }, forcedTestnet)
        else
          try {
            console.log(`Trying mainnet for ${txLink}...`)
            res = await fetchTransactions({ hash: txLink, limit: 1 }, testnet)
            if (res.transactions.length === 0) throw new Error('No transactions found')
          } catch {
            console.log(`Trying testnet for ${txLink}...`)
            testnet = true
            await waitForRateLimit()
            res = await fetchTransactions({ hash: txLink, limit: 1 }, testnet)
            if (res.transactions.length === 0) throw new Error(`No transactions found`)
          }
        hash = Buffer.from(res.transactions[0].hash, 'base64')
        lt = BigInt(res.transactions[0].lt)
        addr = Address.parseRaw(res.transactions[0].account)
      } catch (e) {
        let msg = 'very strange error'
        if (e instanceof Error) {
          msg = e.message
        }
        throw new Error(`Unknown tx link format: ${msg}`)
      }
    }
  }
  return { tx: { lt, hash, addr }, testnet }
}

export function txToLinks(opts: BaseTxInfo, testnet: boolean): TxLinks {
  return {
    toncx: `https://${testnet ? 'testnet.' : ''}ton.cx/tx/${opts.lt}:${opts.hash.toString('base64')}:${opts.addr.toString()}`,
    tonviewer: `https://${testnet ? 'testnet.' : ''}tonviewer.com/transaction/${opts.hash.toString('hex')}`,
    tonscan: `https://${testnet ? 'testnet.' : ''}tonscan.org/tx/${opts.hash.toString('base64')}`,
    toncoin: `https://${testnet ? 'test-' : ''}explorer.toncoin.org/transaction?account=${opts.addr.toString()}&lt=${opts.lt}&hash=${opts.hash.toString('hex')}`,
    dton: `https://${testnet ? 'testnet.' : ''}dton.io/tx/F64C6A3CDF3FAD1D786AACF9A6130F18F3F76EEB71294F53BBD812AD3703E70A`,
  }
}

export function customStringify(obj: any, indent = 2, level = 0): string {
  const indentation = ' '.repeat(level * indent)
  const nextIndentation = ' '.repeat((level + 1) * indent)

  if (typeof obj !== 'object' || obj === null) {
    if (typeof obj === 'string') {
      return obj
    }
    return String(obj)
  }

  if (Array.isArray(obj)) {
    const arrayElements = obj
      .map((element) => customStringify(element, indent, level + 1))
      .join(',\n' + nextIndentation)
    return `[\n${nextIndentation}${arrayElements}\n${indentation}]`
  }

  const entries = Object.entries(obj)
    .map(([key, value]) => {
      const formattedValue = customStringify(value, indent, level + 1)
      return `${nextIndentation}${key}: ${formattedValue}`
    })
    .join(',\n')

  return `{\n${entries}\n${indentation}}`
}

export function parseC5(line: string): (OutAction | OutActionReserve)[] {
  // example:
  // final c5: C{B5EE9C7...8877FA}
  const cellBoc = Buffer.from(line.slice(12, -1), 'hex')
  const c5 = Cell.fromBoc(cellBoc)[0]
  const c5Slice = c5.beginParse()
  return loadOutList(c5Slice)
}

function b64ToBigInt(b64: string): bigint {
  return BigInt('0x' + Buffer.from(b64, 'base64').toString('hex'))
}

function normalizeStateFromAPI(givenState: StateFromAPI): AccountState {
  if (givenState.type === 'uninit')
    return {
      type: 'uninit',
    }
  if (givenState.type === 'frozen')
    return {
      type: 'frozen',
      stateHash: b64ToBigInt(givenState.stateHash),
    }
  else
    return {
      type: 'active',
      state: {
        code: givenState.code ? Cell.fromBase64(givenState.code) : undefined,
        data: givenState.data ? Cell.fromBase64(givenState.data) : undefined,
      },
    }
}

export function createShardAccountFromAPI(
  apiAccount: AccountFromAPI,
  address: Address
): ShardAccount {
  function toMaybeBN(num: number | undefined): bigint {
    return num !== undefined ? BigInt(num) : 0n
  }
  return {
    account: {
      addr: address,
      storage: {
        lastTransLt: BigInt(apiAccount.last?.lt || 0),
        balance: { coins: BigInt(apiAccount.balance.coins || 0) },
        state: normalizeStateFromAPI(apiAccount.state),
      },
      storageStats: {
        used: {
          cells: toMaybeBN(apiAccount.storageStat?.used.cells),
          bits: toMaybeBN(apiAccount.storageStat?.used.bits),
          publicCells: toMaybeBN(apiAccount.storageStat?.used.publicCells),
        },
        lastPaid: apiAccount.storageStat?.lastPaid || 0,
        duePayment:
          typeof apiAccount.storageStat?.duePayment === 'string'
            ? BigInt(apiAccount.storageStat?.duePayment)
            : null,
      },
    },
    lastTransactionLt: BigInt(apiAccount.last?.lt || 0),
    lastTransactionHash: apiAccount.last?.hash ? b64ToBigInt(apiAccount.last?.hash) : 0n,
  }
}

export async function getOtherTxs(
  client: TonClient,
  opts: {
    address: Address
    lt: number | bigint | string
    minLt?: number | bigint | string
    hash?: string
  }
): Promise<Transaction[]> {
  const txsInBlock = await CallForSuccess(() =>
    client.getTransactions(opts.address, {
      inclusive: true,
      // last - requested tx lt
      lt: opts.lt.toString(),
      to_lt:
        opts.minLt?.toString() ||
        // to the first tx in the block for this addr (it starts from 462xxxxx000001 lt)
        // e.g.:  46297691000025, 46297691000043 -> 46297691000000
        ((BigInt(opts.lt) / 10000n) * 10000n).toString(),
      hash: opts.hash,
      archival: true,
      limit: 1000,
    })
  )
  return txsInBlock
}

export async function waitForRateLimit() {
  return new Promise((resolve) => setTimeout(resolve, 1000))
}
