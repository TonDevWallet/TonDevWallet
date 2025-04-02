import { Blockchain, SmartContractTransaction } from '@ton/sandbox'
import {
  beginCell,
  Cell,
  storeMessage,
  storeShardAccount,
  Transaction,
  loadTransaction,
  Address,
} from '@ton/core'
import { loadConfigParamsAsSlice, parseFullConfig, TonClient, TonClient4 } from '@ton/ton'
import { LiteClient } from 'ton-lite-client'
import {
  BaseTxInfo,
  createShardAccountFromAPI,
  getOtherTxs,
  linkToTx,
  getMcSeqnoByShard,
} from './helpers'
import { EmulationResult, IExecutor } from '@ton/sandbox/dist/executor/Executor'
import { checkForLibraries, megaLibsCell } from '@/hooks/useEmulatedTxInfo'
import { ParsedTransaction } from '../ManagedBlockchain'

/**
 * Emulates a transaction with full execution stack details
 *
 * @param liteClient - The LiteClient instance for TON blockchain
 * @param txLink - Transaction link or transaction info object
 * @param forcedTestnet - Force using testnet instead of mainnet
 * @param sendStatus - Optional callback for reporting status updates
 * @returns Transaction emulation result with stack information
 */
export async function getEmulationWithStack(
  liteClient: LiteClient,
  txLink: string | BaseTxInfo,
  forcedTestnet: boolean = false,
  sendStatus: (status: string) => void = () => {}
): Promise<{
  tx: ParsedTransaction
}> {
  // Parse transaction info from link or use provided info
  const { txInfo, testnet } = await parseTxInfo(txLink, forcedTestnet)

  // Initialize TON clients
  const { clientV4, clientV2 } = initializeClients(testnet)

  // Fetch transaction and blockchain data
  const { tx, mcBlockSeqno, randSeed, fullBlock } = await fetchTransactionData(
    clientV4,
    txInfo,
    testnet,
    sendStatus
  )

  // Find minimum LT for account in block
  const minLt = findMinLtInBlock(fullBlock, txInfo.addr, tx.tx.lt)

  // Get previous transactions
  sendStatus('Getting previous txs')
  const txs = await getOtherTxs(clientV2, {
    address: txInfo.addr,
    lt: txInfo.lt,
    minLt: minLt - 1n,
    hash: txInfo.hash.toString('base64'),
  })

  // Get blockchain config
  sendStatus('Getting blockchain config')
  const { blockConfig } = await getBlockchainConfig(clientV4, mcBlockSeqno)

  // Get account state from previous block
  sendStatus('Getting account state')
  const { initialShardAccount, libsToCheck } = await getAccountState(
    clientV4,
    mcBlockSeqno,
    txInfo.addr,
    tx
  )

  // Check libraries
  await checkForLibraries(libsToCheck, liteClient)

  // Create blockchain emulator
  sendStatus('Creating emulator')
  // const { emulateFunction } = await createEmulator(blockConfig, randSeed)
  const blockchain = await Blockchain.create()
  const executor = blockchain.executor

  // Emulate previous transactions
  const { lastTxEmulated } = await emulateTransactions(
    executor,
    blockConfig,
    randSeed,
    initialShardAccount,
    txs,
    sendStatus
  )

  // Validate emulation result
  if (!lastTxEmulated) throw new Error('No last tx emulated')

  const parsedTx: ParsedTransaction = {
    events: [],
    parent: undefined,
    children: [],
    externals: [],
    ...lastTxEmulated,
  }
  // Build the EmulateWithStackResult object with proper properties
  return {
    tx: parsedTx,
  }
}

/**
 * Parse transaction info from link or use provided info
 */
async function parseTxInfo(
  txLink: string | BaseTxInfo,
  forcedTestnet: boolean
): Promise<{ txInfo: BaseTxInfo; testnet: boolean }> {
  let txInfo: BaseTxInfo
  let testnet = forcedTestnet || false

  if (typeof txLink === 'string') {
    const txGot = await linkToTx(txLink, forcedTestnet)
    txInfo = txGot.tx
    testnet = txGot.testnet
  } else {
    txInfo = txLink
  }

  return { txInfo, testnet }
}

/**
 * Initialize TON clients for mainnet or testnet
 */
function initializeClients(testnet: boolean): { clientV4: TonClient4; clientV2: TonClient } {
  const endpointV4 = `https://${testnet ? 'sandbox' : 'mainnet'}-v4.tonhubapi.com`
  const endpointV2 = `https://${testnet ? 'testnet.' : ''}toncenter.com/api/v2/jsonRPC`

  const clientV4 = new TonClient4({
    endpoint: endpointV4,
    timeout: 20000,
    requestInterceptor: (config) => {
      config.headers['Content-Type'] = 'application/json'
      return config
    },
  })

  const clientV2 = new TonClient({ endpoint: endpointV2, timeout: 10000 })

  return { clientV4, clientV2 }
}

/**
 * Fetch transaction and blockchain data
 */
async function fetchTransactionData(
  clientV4: TonClient4,
  txInfo: BaseTxInfo,
  testnet: boolean,
  sendStatus: (status: string) => void
): Promise<{
  tx: any
  mcBlockSeqno: number
  randSeed: Buffer
  fullBlock: any
}> {
  const { lt, hash, addr: address } = txInfo

  sendStatus('Getting the tx')
  const tx = (await clientV4.getAccountTransactions(address, lt, hash))[0]

  const { mcSeqno, randSeed } = await getMcSeqnoByShard(tx.block, testnet)
  const fullBlock = await clientV4.getBlock(mcSeqno)
  const mcBlockSeqno = fullBlock.shards[0].seqno

  return { tx, mcBlockSeqno, randSeed, fullBlock }
}

/**
 * Find minimum LT value for account in block
 */
function findMinLtInBlock(fullBlock: any, address: Address, currentLt: bigint): bigint {
  let minLt = currentLt
  const addrStr = address.toString()

  for (const shard of fullBlock.shards) {
    for (const txInBlock of shard.transactions) {
      if (txInBlock.account === addrStr && BigInt(txInBlock.lt) < minLt) {
        minLt = BigInt(txInBlock.lt)
      }
    }
  }

  return minLt
}

/**
 * Get blockchain config
 */
async function getBlockchainConfig(
  clientV4: TonClient4,
  mcBlockSeqno: number
): Promise<{ blockConfig: string; configInfo: any }> {
  const getConfigResult = await clientV4.getConfig(mcBlockSeqno)
  const blockConfig = getConfigResult.config.cell
  const configInfo = parseFullConfig(loadConfigParamsAsSlice(blockConfig)).msgPrices

  return { blockConfig, configInfo }
}

/**
 * Get account state from previous block
 */
async function getAccountState(
  clientV4: TonClient4,
  mcBlockSeqno: number,
  address: Address,
  tx: any
): Promise<{ initialShardAccount: any; libsToCheck: Cell[] }> {
  const getAccountResult = await clientV4.getAccount(mcBlockSeqno - 1, address)
  const account = getAccountResult.account
  const initialShardAccount = createShardAccountFromAPI(account, address)

  const libsToCheck: Cell[] = []
  const state = initialShardAccount.account?.storage.state

  if (state?.type === 'active' && state.state.code instanceof Cell) {
    libsToCheck.push(state.state.code)
  }

  const msgInit = tx.tx.inMessage?.init
  if (msgInit && msgInit.code instanceof Cell) {
    libsToCheck.push(msgInit.code)
  }

  return { initialShardAccount, libsToCheck }
}

// Create transaction emulation function
async function emulateFunction(
  executor: IExecutor,
  blockConfig: string,
  randSeed: Buffer,
  tx: Transaction,
  shardAccountStr: string
): Promise<EmulationResult> {
  const msg = tx.inMessage
  if (!msg) throw new Error('No in_message was found in tx')

  return executor.runTransaction({
    config: blockConfig,
    libs: megaLibsCell,
    verbosity: 'full_location_stack_verbose',
    shardAccount: shardAccountStr,
    message: beginCell().store(storeMessage(msg)).endCell(),
    now: tx.now,
    lt: tx.lt,
    randomSeed: randSeed,
    ignoreChksig: false,
    debugEnabled: true,
  })
}

/**
 * Emulate transactions
 */
async function emulateTransactions(
  executor: IExecutor,
  blockConfig: string,
  randSeed: Buffer,
  initialShardAccount: any,
  txs: Transaction[],
  sendStatus: (status: string) => void
): Promise<{
  shardAccountStr: string
  lastTxEmulated: SmartContractTransaction | null
}> {
  // Prepare transactions in correct order
  const prevTxsInBlock = txs.slice(0)
  prevTxsInBlock.reverse()

  // Initialize shard account
  initialShardAccount.lastTransactionLt = 0n
  initialShardAccount.lastTransactionHash = 0n

  let shardAccountStr = beginCell()
    .store(storeShardAccount(initialShardAccount))
    .endCell()
    .toBoc()
    .toString('base64')

  // Emulate transactions
  sendStatus('Emulating')
  let lastTxEmulated: SmartContractTransaction | null = null

  while (prevTxsInBlock.length > 0) {
    let txCounter = 1
    const currentTx = prevTxsInBlock.pop()
    if (!currentTx) break

    // let txCounter = 1
    sendStatus(`Emulating ${txCounter}/${prevTxsInBlock.length}`)
    const emulationResult = await emulateFunction(
      executor,
      blockConfig,
      randSeed,
      currentTx,
      shardAccountStr
    )

    // Verify emulation success
    if (!emulationResult.result.success) {
      console.log(emulationResult.logs)
      console.log(emulationResult.debugLogs)
      throw new Error(`Transaction failed for lt: ${currentTx.lt}`)
    }

    // Verify state consistency
    const emulatedTx = loadTransaction(
      Cell.fromBase64(emulationResult.result.transaction).asSlice()
    )
    const stateUpdateOk = emulatedTx.stateUpdate.newHash.equals(currentTx.stateUpdate.newHash)
    if (!stateUpdateOk) {
      console.log('State update failed')
      console.log(emulationResult)
      throw new Error(`State update failed for lt: ${currentTx.lt}`)
    }

    // Update shard account
    shardAccountStr = emulationResult.result.shardAccount
    // const parsedShardAccount = loadShardAccount(Cell.fromBase64(shardAccountStr).asSlice())
    // const newBalance = parsedShardAccount.account?.storage.balance.coins
    // console.log(`lt: ${currentTx.lt} balance: ${newBalance}`)

    txCounter++
    const tx = loadTransaction(Cell.fromBase64(emulationResult.result.transaction).asSlice())
    lastTxEmulated = {
      ...tx,
      blockchainLogs: emulationResult.logs,
      vmLogs: emulationResult.result.vmLog,
      debugLogs: emulationResult.debugLogs,
      oldStorage: undefined,
      newStorage: undefined,
    }
  }

  return { shardAccountStr, lastTxEmulated }
}
