import { bigIntToBuffer, tonToNumber } from '@/utils/ton'
import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Address } from 'ton-core'
import { AddressRow } from '../AddressRow'
import { TxNodeData } from './MessageFlow'
import { cn } from '@/utils/cn'

export const TxNode = memo(({ data }: { data: TxNodeData; id: string }) => {
  const tx = data.tx
  const txAddress = new Address(0, bigIntToBuffer(tx.address))
  const rootAddress = new Address(0, bigIntToBuffer(data.rootTx.address))

  const isTxError =
    (tx.description.type === 'generic' &&
      tx.description.computePhase.type === 'vm' &&
      tx.description.computePhase.exitCode !== 0) ||
    (tx.description.type === 'generic' &&
      tx.description.actionPhase &&
      tx.description.actionPhase?.resultCode !== 0) ||
    (tx.description.type === 'generic' && tx.description.bouncePhase?.type)

  return (
    <div
      className={cn(
        'p-2 rounded',
        rootAddress.equals(txAddress) ? 'bg-blue-500 text-white' : 'bg-foreground text-black',
        isTxError && 'bg-red-500 text-white'
      )}
    >
      <AddressRow address={txAddress} />
      <div>ID: {tx.id}</div>
      <div>LT: {tx.lt.toString()}</div>
      <div>Self Fees: {tonToNumber(tx.gasSelf)}</div>
      <div>Total Fees: {tonToNumber(tx.gasFull)}</div>
      {tx.description.type === 'generic' && tx.description.computePhase.type === 'vm' && (
        <div>Compute Code: {tx.description.computePhase.exitCode}</div>
      )}
      {tx.description.type === 'generic' && (
        <div>Action Code: {tx.description.actionPhase?.resultCode}</div>
      )}
      {tx.description.type === 'generic' && tx.description.bouncePhase?.type && (
        <div>Bounce Phase Type: {tx.description.bouncePhase?.type}</div>
      )}

      <Handle type="target" position={Position.Top} draggable={false} isConnectable={false} />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        draggable={false}
        className=""
      ></Handle>
    </div>
  )
})
