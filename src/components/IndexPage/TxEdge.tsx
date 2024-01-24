import { cn } from '@/utils/cn'
import { bigIntToBuffer } from '@/utils/ton'
import { FC } from 'react'
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow'
import { Address } from '@ton/core'
import { GraphTx } from './MessageFlow'

export const TxEdge: FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const from = data.from as GraphTx
  const to = data.to as GraphTx

  const toInMessage = to.inMessage?.info

  if (!toInMessage || toInMessage.type !== 'internal') {
    console.log('no to in')
    return <></>
  }

  const outMessage = from.outMessages
    .values()
    .find((m) => m.info.type === 'internal' && m.info.createdLt === toInMessage.createdLt)

  if (outMessage?.info.type !== 'internal') {
    console.log('out not internal', outMessage, from.outMessages, toInMessage)
    return <></>
  }

  const rootAddress = new Address(0, bigIntToBuffer(data.rootTx.address))
  const fromAddress = new Address(0, bigIntToBuffer(from.address))
  const toAddress = outMessage.info.dest

  return (
    <>
      <path id={id} className="react-flow__edge-path" d={edgePath} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className={cn(
            'nodrag nopan p-2 rounded bg-foreground text-background',
            rootAddress.equals(fromAddress) && 'bg-red-500 text-foreground',
            rootAddress.equals(toAddress) && 'bg-green-700 text-foreground'
          )}
        >
          {Number(outMessage?.info.value.coins) / 10 ** 9} TON
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
