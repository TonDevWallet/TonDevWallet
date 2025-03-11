import { Address, Cell, Dictionary, Slice, TupleItem } from '@ton/core'
import { Blockchain } from '@ton/sandbox'
import { LiteClientBlockchainStorage } from '@/utils/liteClientBlockchainStorage'
// eslint-disable-next-line camelcase
import { sha256_sync } from '@ton/crypto'
import { LiteClient } from 'ton-lite-client'
import { fetch as tFetch } from '@tauri-apps/api/http'
import { JettonContent } from '@/types/jetton'

interface NFTDictValue {
  content: Buffer
}

interface ChunkDictValue {
  content: Buffer
}

export function flattenSnakeCell(cell: Cell) {
  let c: Cell | null = cell

  let res = Buffer.alloc(0)

  while (c) {
    const cs = c.beginParse()
    if (cs.remainingBits === 0 && cs.remainingRefs < 1) {
      return res
    }
    if (cs.remainingBits % 8 !== 0) {
      throw Error('Number remaining of bits is not multiply of 8')
    }

    if (cs.remainingBits > 0) {
      const data = cs.loadBuffer(cs.remainingBits / 8)
      res = Buffer.concat([res, data])
    }
    c = c.refs && c.refs[0]
  }

  return res
}

export const ChunkDictValueSerializer = {
  serialize() {},
  parse(src: Slice): ChunkDictValue {
    const snake = flattenSnakeCell(src.loadRef())
    return { content: snake }
  },
}

export function ParseChunkDict(cell: Slice): Buffer {
  const dict = cell.loadDict(Dictionary.Keys.Uint(32), ChunkDictValueSerializer)

  let buf = Buffer.alloc(0)
  for (const [, v] of dict) {
    buf = Buffer.concat([buf, v.content])
  }
  return buf
}

export const NFTDictValueSerializer = {
  serialize() {},
  parse(src: Slice): NFTDictValue {
    let ref = src
    if (src.remainingBits === 0 && src.remainingRefs > 0) {
      ref = src.loadRef().asSlice()
    }

    const start = ref.loadUint(8)
    if (start === 0) {
      const snake = flattenSnakeCell(ref.asCell())
      return { content: snake }
    }

    if (start === 1) {
      return { content: ParseChunkDict(ref) }
    }

    return { content: Buffer.from([]) }
  },
}

// const ONCHAIN_CONTENT_PREFIX = 0x00
// const SNAKE_PREFIX = 0x00

// function sliceToString(slice: Buffer): string {
//   return slice.toString('utf-8')
// }

const jettonKeys = [
  'image', // img
  'name',
  'description',
  // 'content_url',
  'decimals',
  'symbol',
  'image_data',
  'uri',
]

const OFF_CHAIN_CONTENT_PREFIX = 0x01

const jettonHashKeys = jettonKeys.map(sha256_sync)

export function decodeOffChainContent(content: Cell) {
  const data = flattenSnakeCell(content)

  const prefix = data[0]
  if (prefix !== OFF_CHAIN_CONTENT_PREFIX) {
    throw new Error(`Unknown content prefix: ${prefix.toString(16)}`)
  }
  return data.slice(1).toString()
}

export async function loadJettonMetadata(contentCell: Cell): Promise<JettonContent> {
  const data = contentCell.beginParse()
  const contentType = data.preloadUint(8)
  const result: JettonContent = {}

  if (contentType === 0) {
    data.skip(8)
    try {
      const dict = data.loadDict(Dictionary.Keys.Buffer(32), NFTDictValueSerializer)

      for (const [i, key] of jettonKeys.entries()) {
        const dictKey = jettonHashKeys[i]
        const dictValue = dict.get(dictKey)
        if (dictValue) {
          result[key] = dictValue.content.toString('utf-8')
        }
      }
    } catch (e) {
      console.log('Error LoadDict jettonKeys', e)
    }
  }
  if (contentType === 1 || result.uri) {
    let networkUrl = contentType === 1 ? decodeOffChainContent(data.asCell()) : result.uri
    if (!networkUrl) {
      networkUrl = ''
    }
    if (networkUrl.startsWith('ipfs://')) {
      networkUrl = networkUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')
    }

    try {
      const { data: urlData } = await tFetch<{
        iconUrl: string
        name: string
        url: string
      }>(networkUrl)
      // const { data: urlData } = await axios(networkUrl)
      for (const key of jettonKeys) {
        if (urlData[key]) {
          result[key] = urlData[key].toString()
        }
      }
    } catch (e) {
      //
    }
  }

  return result
}

export async function fetchJettonInfo(address: Address, liteClient: LiteClient) {
  try {
    // Create blockchain instance with lite client storage
    const blockchain = await Blockchain.create({
      storage: new LiteClientBlockchainStorage(liteClient as any),
    })

    // Run get_jetton_data() method
    const result = await blockchain.runGetMethod(address, 'get_jetton_data')

    if (result.exitCode !== 0) {
      throw new Error(`get_jetton_data failed with exit code ${result.exitCode}`)
    }

    // Parse results
    const [totalSupply, mintable, adminAddr, contentCell] = result.stack as TupleItem[]

    // Cast contentCell to access cell property
    const cell = (contentCell as any).cell as Cell
    const metadata = await loadJettonMetadata(cell)

    return {
      totalSupply: (totalSupply as any).value as bigint,
      mintable: ((mintable as any).value as number) === -1,
      adminAddress: adminAddr.type === 'cell' ? null : (adminAddr as any).address,
      metadata,
    }
  } catch (e) {
    console.error('Error fetching jetton info:', e)
    throw e
  }
}
