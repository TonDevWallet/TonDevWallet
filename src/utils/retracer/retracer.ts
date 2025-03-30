import { Blockchain } from '@ton/sandbox'
import {
  beginCell,
  Cell,
  storeMessage,
  storeShardAccount,
  loadShardAccount,
  Transaction,
  loadTransaction,
} from '@ton/core'
import { loadConfigParamsAsSlice, parseFullConfig, TonClient, TonClient4 } from '@ton/ton'
import { LiteClient } from 'ton-lite-client'
import {
  BaseTxInfo,
  createShardAccountFromAPI,
  EmulateWithStackResult,
  getOtherTxs,
  linkToTx,
  mcSeqnoByShard,
} from './helpers'
import { EmulationResult } from '@ton/sandbox/dist/executor/Executor'
import { checkForLibraries, megaLibsCell } from '@/hooks/useEmulatedTxInfo'

export async function getEmulationWithStack(
  liteClient: LiteClient,
  txLink: string | BaseTxInfo,
  forcedTestnet: boolean = false,
  sendStatus: (status: string) => void = () => {}
): Promise<EmulateWithStackResult> {
  let txInfo: BaseTxInfo
  let testnet = forcedTestnet || false
  if (typeof txLink === 'string') {
    const txGot = await linkToTx(txLink, forcedTestnet)
    txInfo = txGot.tx
    testnet = txGot.testnet
  } else {
    txInfo = txLink
  }

  const { lt, hash, addr: address } = txInfo

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

  // 1. get tx alone to get the mc block seqno
  sendStatus('Getting the tx')
  const tx = (await clientV4.getAccountTransactions(address, lt, hash))[0]
  console.log(tx.tx.now, 'tx time')
  // await waitForRateLimit()
  const { mcSeqno, randSeed } = await mcSeqnoByShard(tx.block, testnet)
  // await waitForRateLimit()
  const fullBlock = await clientV4.getBlock(mcSeqno)
  const mcBlockSeqno = fullBlock.shards[0].seqno

  // 2. find min lt tx on account in block
  // let isOurTxLastTx = true
  let minLt = tx.tx.lt
  const addrStr = address.toString()
  for (const shard of fullBlock.shards) {
    for (const txInBlock of shard.transactions) {
      if (txInBlock.account === addrStr) {
        if (BigInt(txInBlock.lt) < minLt) {
          minLt = BigInt(txInBlock.lt)
        }
        // won't check balance at the end if our tx
        // is not last in block
        // if (BigInt(txInBlock.lt) > tx.tx.lt) {
        //   // isOurTxLastTx = false
        // }
      }
    }
  }

  // 3. get txs from the mc block (maybe many shard blocks)
  sendStatus('Getting previous txs')
  const txs = await getOtherTxs(clientV2, {
    address,
    lt,
    minLt: minLt - 1n,
    hash: hash.toString('base64'),
  })

  console.log(txs.length, 'transactions found')
  console.log('first:', txs[txs.length - 1].lt, 'last:', txs[0].lt)

  // 3.1 get blockchain config
  sendStatus('Getting blockchain config')
  // await waitForRateLimit()
  const getConfigResult = await clientV4.getConfig(mcBlockSeqno)
  const blockConfig = getConfigResult.config.cell
  console.log('Fees:', parseFullConfig(loadConfigParamsAsSlice(blockConfig)).msgPrices)

  // 4. get prev. state from prev. block
  sendStatus('Getting account state')
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
  await checkForLibraries(libsToCheck, liteClient)

  // 5. prep. emulator
  sendStatus('Creating emulator')
  const blockchain = await Blockchain.create()
  const executor = blockchain.executor

  // function - to use in with prev txs
  async function _emulate(_tx: Transaction, _shardAccountStr: string) {
    const _msg = _tx.inMessage
    if (!_msg) throw new Error('No in_message was found in tx')

    const _txRes = executor.runTransaction({
      config: blockConfig,
      libs: megaLibsCell,
      verbosity: 'full_location_stack_verbose',
      shardAccount: _shardAccountStr,
      message: beginCell().store(storeMessage(_msg)).endCell(),
      now: _tx.now,
      lt: _tx.lt,
      randomSeed: randSeed,
      ignoreChksig: false,
      debugEnabled: true,
    })

    return _txRes
  }

  // reverse the array because first txs
  // in inital list are the new ones
  const prevTxsInBlock = txs.slice(0)
  prevTxsInBlock.reverse()

  // for first transaction (executor doesn't know about last tx):
  initialShardAccount.lastTransactionLt = 0n
  initialShardAccount.lastTransactionHash = 0n

  let shardAccountStr = beginCell()
    .store(storeShardAccount(initialShardAccount))
    .endCell()
    .toBoc()
    .toString('base64')

  sendStatus('Emulating')
  let lastTxEmulated: EmulationResult | null = null
  if (prevTxsInBlock.length > 0) {
    let on = 1
    for (const _tx of prevTxsInBlock) {
      sendStatus(`Emulating ${on}/${prevTxsInBlock.length}`)
      const midRes = await _emulate(_tx, shardAccountStr)

      if (!midRes.result.success) {
        console.log(midRes.logs)
        console.log(midRes.debugLogs)
        throw new Error(`Transaction failed for lt: ${_tx.lt}`)
      }

      const midTxOccured = loadTransaction(Cell.fromBase64(midRes.result.transaction).asSlice())
      const stateOk = midTxOccured.stateUpdate.newHash.equals(_tx.stateUpdate.newHash)

      console.log('State update ok:', stateOk)

      shardAccountStr = midRes.result.shardAccount

      const parsedShardAccount = loadShardAccount(Cell.fromBase64(shardAccountStr).asSlice())

      const newBalance = parsedShardAccount.account?.storage.balance.coins
      console.log(`lt: ${_tx.lt} balance: ${newBalance}`)

      console.log('')
      on++
      lastTxEmulated = midRes
    }
  }

  if (!lastTxEmulated) throw new Error('No last tx emulated')
  if (!lastTxEmulated.result.success) {
    throw new Error('Last tx failed')
  }
  const theTx = loadTransaction(Cell.fromBase64(lastTxEmulated.result.transaction).asSlice())

  return {
    tx: theTx,
  } as any
}
