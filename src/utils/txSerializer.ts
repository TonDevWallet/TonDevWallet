import { Transaction, storeTransaction, beginCell, Cell, loadTransaction } from '@ton/core'
import { ParsedTransaction } from './ManagedBlockchain'
import { parseInternal } from '@truecarry/tlb-abi'

const fieldsToSave = [
  'blockchainLogs',
  'vmLogs',
  'debugLogs',
  // 'oldStorage',
  // 'newStorage',
  // 'events',
  // 'parent',
  // 'children',
  // 'externals',
  // 'shards',
  'shard',
  'delay',
  'totalDelay',
  // 'parsed',
]

export function SerializeTransactionsList(txes: ParsedTransaction[]): string {
  const dump = {
    transactions: txes.map((t) => {
      const tx = beginCell()
        .store(storeTransaction(t as Transaction))
        .endCell()
        .toBoc()
        .toString('base64')

      return {
        transaction: tx,
        fields: fieldsToSave.reduce((acc, f) => {
          acc[f] = t[f]
          return acc
        }, {}),
        parentId: t.parent?.lt.toString(),
        childrenIds: t.children?.map((c) => c.lt.toString()),
      }
    }),
  }
  const jsonDump = JSON.stringify(dump, null, 2)
  //   console.log(jsonDump)
  return jsonDump
}

export function DeserializeTransactionsList(jsonDump: string): {
  transactions: ParsedTransaction[]
} {
  const dump = JSON.parse(jsonDump)
  const parsedTxes = dump.transactions.map((t: any) => {
    const tx = Cell.fromBase64(t.transaction).beginParse()
    const parsedTx = loadTransaction(tx)
    if (parsedTx?.inMessage?.body) {
      const parsed = parseInternal(parsedTx.inMessage.body.asSlice())
      if (parsed) {
        ;(parsedTx as any).parsed = parsed
      }
    }

    return {
      ...parsedTx,
      ...t.fields,
      parentId: t.parentId ? BigInt(t.parentId) : undefined,
      childrenIds: t.childrenIds ? t.childrenIds.map((id: any) => BigInt(id)) : undefined,
    }
  })

  // populate children and parent
  for (let i = 0; i < parsedTxes.length; i++) {
    parsedTxes[i].children = parsedTxes.filter((t) => t.parentId === parsedTxes[i].lt)
    parsedTxes[i].parent = parsedTxes.find((t) => t.lt === parsedTxes[i].parentId)
  }

  return {
    transactions: parsedTxes,
  }
}
