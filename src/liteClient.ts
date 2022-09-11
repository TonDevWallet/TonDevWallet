// import axios from 'axios'
// import { IS_TESTNET } from '@/config'
import { LiteClient, LiteRoundRobinEngine, LiteSingleEngine } from 'ton-lite-client'
import networkConfig from '@/networkConfig'
import { createContext, useContext } from 'react'

const { tmpClient, endWait } = getTempClient()
let liteClient: LiteClient = tmpClient
let initCalled = false

export const LiteClientContext = createContext<LiteClient>(tmpClient)

export const useLiteclient = () => useContext(LiteClientContext)

const IS_TESTNET = true

function getTempClient() {
  interface queueItem {
    method: string
    args: unknown[]
    resolve: () => void
    reject: () => void
  }

  const queue: queueItem[] = []
  let localClient: LiteClient | undefined

  const createShim = (name: string) => {
    return (...args: unknown[]) => {
      if (localClient) {
        return localClient[name](...args)
      }

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      let _resolve: () => void = () => {}
      // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-explicit-any
      let _reject: (reason?: any) => void = () => {}

      const p = new Promise<void>((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })

      queue.push({
        method: name,
        args: [...args],
        resolve: _resolve,
        reject: _reject,
      })

      return p
    }
  }
  const tempWait = {}
  for (const name of [
    'getMasterchainInfo',
    'getAccountState',
    'getAccountTransactions',
    'sendMessage',
    'getMasterchainInfoExt',
    'getCurrentTime',
    'getVersion',
    'getConfig',
    'getAccountTransaction',
    'runMethod',
    'lookupBlockByID',
    'getBlockHeader',
    'getAllShardsInfo',
    'listBlockTransactions',
    'getFullBlock',
  ]) {
    tempWait[name] = createShim(name)
  }

  const endWait = (client: LiteClient) => {
    localClient = client
    for (const item of queue) {
      // console.log('item work', item, lc)
      if (client && client[item.method]) {
        client[item.method](...item.args)
          .then(item.resolve)
          .catch(item.reject)
      }
    }
  }

  return {
    tmpClient: tempWait as LiteClient,
    endWait,
  }
}

async function initLiteClient() {
  if (initCalled) {
    return
  }
  // const configUrl = CONFIG_URL
  // process.env.TONCONFIG_URL ||
  // 'https://ton-blockchain.github.io/testnet-global.config.json'

  // const { data } = await axios(configUrl)c
  const data = IS_TESTNET ? networkConfig.testnetConfig : networkConfig.mainnetConfig

  const engines: LiteSingleEngine[] = []
  // while (engines.length < 50) {
  for (const ls of data.liteservers.slice(1, 2)) {
    const pubkey = encodeURIComponent(ls.id.key)
    engines.push(
      new LiteSingleEngine({
        host: `wss://ws.tonlens.com/?ip=${ls.ip}&port=${ls.port}&pubkey=${pubkey}`,
        // host: `ws://127.0.0.1:5999/?dest_host=${intToIP(ls.ip)}:${ls.port}`,
        publicKey: Buffer.from(ls.id.key, 'base64'),
      })
    )
  }

  const engine = new LiteRoundRobinEngine(engines)
  const client = new LiteClient({ engine })

  liteClient = client
  initCalled = true
  endWait(client)

  setInterval(async () => {
    await liteClient.getMasterchainInfo()
  }, 30000)
}

// function intToIP(int: number) {
//   const part1 = int & 255
//   const part2 = (int >> 8) & 255
//   const part3 = (int >> 16) & 255
//   const part4 = (int >> 24) & 255

//   return `${part4}.${part3}.${part2}.${part1}`
// }

export default liteClient

export { initLiteClient, liteClient }
