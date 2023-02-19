import { LiteClient, LiteRoundRobinEngine, LiteSingleEngine } from 'ton-lite-client'
import networkConfig from '@/networkConfig'
import { hookstate, useHookstate } from '@hookstate/core'
import { tauriState } from './tauri'
import { getDatabase } from '@/db'
import { delay } from '@/utils'

const LiteClientState = hookstate<{
  liteClient: LiteClient
  testnet: boolean
}>(async () => {
  const db = await getDatabase()
  const testnetSetting = await db<{ name: string; value: string }>('settings')
    .where('name', 'is_testnet')
    .first()

  if (!testnetSetting) {
    await db('settings').insert({
      name: 'is_testnet',
      value: 'false',
    })
  }

  const isTestnet = testnetSetting?.value === 'true'

  return {
    testnet: isTestnet,
    liteClient: await getLiteClientAsync(isTestnet),
  }
})

export function useLiteclient() {
  return useHookstate(LiteClientState).liteClient.get({ noproxy: true })
}

export function useLiteclientState() {
  return useHookstate(LiteClientState)
}

export async function changeLiteClient(testnet: boolean) {
  console.log('changeLiteClient', testnet)
  const newLiteClient = await getLiteClientAsync(testnet)

  if (LiteClientState.liteClient.get()) {
    LiteClientState.liteClient.get().engine.close()
  }
  LiteClientState.set({
    testnet,
    liteClient: newLiteClient,
  })

  const db = await getDatabase()
  await db<{ name: string; value: string }>('settings')
    .where('name', 'is_testnet')
    .update('value', String(testnet))

  console.log('update done')
}

export async function getLiteClientAsync(isTestnet: boolean): Promise<LiteClient> {
  const engine = new LiteRoundRobinEngine([])
  const client = new LiteClient({ engine })

  addWorkingEngineToRoundRobin(isTestnet, engine)

  return client
}

async function addWorkingEngineToRoundRobin(isTestnet: boolean, robin: LiteRoundRobinEngine) {
  const data = isTestnet ? networkConfig.testnetConfig : networkConfig.mainnetConfig
  const shuffledEngines = shuffle(data.liteservers)

  const tauri = (await tauriState.promise) || tauriState
  if (!tauri) {
    throw new Error('no tauri')
  }

  while (shuffledEngines.length > 0) {
    const ls = shuffledEngines.pop()
    if (!ls) {
      break
    }

    const pubkey = encodeURIComponent(ls.id.key)
    const singleEngine = new LiteSingleEngine({
      host: `ws://localhost:${tauri.port.get()}/?ip=${ls.ip}&port=${ls.port}&pubkey=${pubkey}`,
      publicKey: Buffer.from(ls.id.key, 'base64'),
      client: 'ws',
    })

    const check = await checkEngine(singleEngine)
    if (!check) {
      singleEngine.close()
      continue
    }

    robin.addSingleEngine(singleEngine)
    break
  }
}

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length
  let randomIndex

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    ;[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
  }

  return array
}

export { LiteClientState }

async function checkEngine(engine: LiteSingleEngine): Promise<boolean> {
  let resolve
  const promise = new Promise<boolean>((_resolve) => {
    resolve = _resolve
  })

  const doChecks = async () => {
    const client = new LiteClient({ engine })

    let rejected = false
    setTimeout(() => {
      rejected = true
      resolve(false)
    }, 1000)

    while (true) {
      if (rejected) {
        break
      }
      try {
        await client.getCurrentTime()
        resolve(true)
        break
      } catch (e) {
        await delay(16)
      }
    }
  }

  doChecks()
  return promise
}
