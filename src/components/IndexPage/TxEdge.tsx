import { cn } from '@/utils/cn'
import { bigIntToBuffer } from '@/utils/ton'
import { FC } from 'react'
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react'
import { Address } from '@ton/core'
import { GraphTx } from './MessageFlow'
import Copier from '../copier'

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

  const from = data?.from as GraphTx
  const to = data?.to as GraphTx

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

  const rootAddress = new Address(0, bigIntToBuffer((data?.rootTx as any)?.address))
  const fromAddress = new Address(0, bigIntToBuffer(from.address))
  const toAddress = outMessage.info.dest

  const tonAmount = Number(outMessage?.info.value.coins) / 10 ** 9

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      {/* <path id={id} className="react-flow__edge-path" d={edgePath} /> */}
      {/* <EdgeLabelRenderer>
        <button
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
          onClick={() => {
            console.log('test')
            // setEdges((es) => es.filter((e) => e.id !== id))
          }}
        >
          delete
        </button>
      </EdgeLabelRenderer> */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={cn(
            'nodrag nopan p-2 rounded bg-foreground text-background flex items-center gap-2',
            rootAddress.equals(fromAddress) && 'bg-red-500 text-foreground',
            rootAddress.equals(toAddress) && 'bg-green-700 text-foreground'
          )}
        >
          <span>{tonAmount} TON</span>
          <Copier
            className="w-4 h-4"
            text={tonAmount.toString()}
            style={{ pointerEvents: 'all' }}
          />
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
