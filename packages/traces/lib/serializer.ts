import {
  Transaction,
  storeTransaction,
  beginCell,
  Cell,
  loadTransaction,
  Address,
  ExternalAddress,
  StateInit,
} from '@ton/core'
// import { parseInternal } from '@truecarry/tlb-abi'

export type ExternalOutInfo = {
  type: 'external-out'
  src: Address
  dest?: ExternalAddress
  createdAt: number
  createdLt: bigint
}
export type ExternalOut = {
  info: ExternalOutInfo
  init?: StateInit
  body: Cell
}

export type TransactionJettonData = {
  balance: bigint
  owner?: Address
  jettonAddress?: Address
}
export type TraceTransaction = Transaction & {
  blockchainLogs: string
  vmLogs: string
  debugLogs: string
  events: Event[]
  parent?: TraceTransaction | undefined
  children: TraceTransaction[]
  externals: ExternalOut[]
  oldStorage?: Cell
  newStorage?: Cell

  shard?: string
  delay?: number
  totalDelay?: number

  jettonData?: TransactionJettonData
}

export type TraceDump = {
  transactions: TraceTransaction[]
}

const fieldsToSave: Array<
  | string
  | {
      name: string
      serialize: (t: any) => any
      deserialize: (t: any) => any
    }
> = [
  'blockchainLogs',
  'vmLogs',
  'debugLogs',
  'shard',
  'delay',
  'totalDelay',
  {
    name: 'jettonData',
    serialize: (t: TransactionJettonData) => {
      if (typeof t === 'undefined') {
        return undefined
      }

      if (t === null) {
        return null
      }

      return {
        balance: t?.balance?.toString() ?? '0',
        owner: t?.owner?.toString() ?? '',
        jettonAddress: t?.jettonAddress?.toString() ?? '',
      }
    },
    deserialize: (t: any) => {
      if (typeof t === 'undefined') {
        return undefined
      }

      if (t === null) {
        return null
      }

      return {
        balance: BigInt(t.balance),
        owner: t.owner ? Address.parse(t.owner) : undefined,
        jettonAddress: t.jettonAddress ? Address.parse(t.jettonAddress) : undefined,
      }
    },
  },
]

export function SerializeTraceDump({ transactions }: TraceDump): string {
  const dump = {
    transactions: transactions.map((t) => {
      const tx = beginCell()
        .store(storeTransaction(t as Transaction))
        .endCell()
        .toBoc()
        .toString('base64')

      return {
        transaction: tx,
        fields: fieldsToSave.reduce((acc, f) => {
          if (typeof f === 'string') {
            acc[f] = (t as any)[f]
          } else {
            acc[f.name] = f.serialize(t)
          }
          return acc
        }, {} as any),
        parentId: t.parent?.lt?.toString(),
        childrenIds: t.children?.map((c) => c?.lt?.toString()),
      }
    }),
  }
  const jsonDump = JSON.stringify(dump, null, 2)
  return jsonDump
}

export function DeserializeTraceDump(jsonDump: string): TraceDump {
  const dump = JSON.parse(jsonDump)
  const parsedTxes: Array<
    TraceTransaction & { parentId: bigint | undefined; childrenIds: bigint[] | undefined }
  > = dump.transactions.map((t: any) => {
    const tx = Cell.fromBase64(t.transaction).beginParse()
    const parsedTx = loadTransaction(tx)
    // if (parsedTx?.inMessage?.body) {
    //   const parsed = parseInternal(parsedTx.inMessage.body.asSlice())
    //   if (parsed) {
    //     ;(parsedTx as any).parsed = parsed
    //   }
    // }

    return {
      ...parsedTx,
      ...fieldsToSave.reduce((acc, f) => {
        if (typeof f === 'string') {
          acc[f] = (t.fields as any)[f]
        } else {
          acc[f.name] = f.deserialize(t.fields[f.name])
        }
        return acc
      }, {} as any),
      parentId: t.parentId ? BigInt(t.parentId) : undefined,
      childrenIds: t.childrenIds ? t.childrenIds.map((id: any) => BigInt(id)) : undefined,
    }
  })

  // populate children and parent
  for (let i = 0; i < parsedTxes.length; i++) {
    parsedTxes[i].children = parsedTxes.filter((t) => t.parentId === parsedTxes[i].lt)
    parsedTxes[i].parent = parsedTxes.find((t) => t.lt === parsedTxes[i].parentId)
  }

  for (let i = 0; i < parsedTxes.length; i++) {
    parsedTxes[i].parentId = undefined
    parsedTxes[i].childrenIds = undefined
  }

  return {
    transactions: parsedTxes,
  }
}
