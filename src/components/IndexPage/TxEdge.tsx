import { cn } from '@/utils/cn'
import { bigIntToBuffer } from '@/utils/ton'
import { FC } from 'react'
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react'
import { Address } from '@ton/core'
import { GraphTx } from './MessageFlow'
import Copier from '../copier'
import { extractEc } from '@ton/sandbox/dist/utils/ec'
import useExtraCurrencies from '@/hooks/useExtraCurrencies'

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
  const { currentNetworkCurrencies: currencies } = useExtraCurrencies()
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
  const extraCurrencies = outMessage?.info.value.other
    ? extractEc(outMessage?.info.value.other)
    : {}

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
          className="flex flex-col gap-2"
        >
          <div
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

          {extraCurrencies &&
            Object.entries(extraCurrencies).map(([currencyId, amount]) => {
              const currencyInfo = currencies[currencyId]
              const decimals = currencyInfo?.decimals || 9
              const symbol = currencyInfo?.symbol || currencyId
              const formattedAmount = Number(amount) / 10 ** decimals

              return (
                <div
                  key={currencyId}
                  className={cn(
                    'nodrag nopan p-2 rounded bg-foreground text-background flex items-center gap-2',
                    rootAddress.equals(fromAddress) && 'bg-red-500 text-foreground',
                    rootAddress.equals(toAddress) && 'bg-green-700 text-foreground'
                  )}
                >
                  <span>
                    {formattedAmount} {symbol}
                  </span>
                  <Copier
                    className="w-4 h-4"
                    text={formattedAmount.toString()}
                    style={{ pointerEvents: 'all' }}
                  />
                </div>
              )
            })}

          {from.shard && to.shard && (
            <div
              className={cn(
                'nodrag nopan p-2 rounded bg-foreground text-background flex items-center gap-2',
                from.shard !== to.shard && 'bg-orange-100 text-orange-800',
                from.shard === to.shard && 'bg-emerald-100 text-emerald-800'
              )}
            >
              <span>
                Shard {from.shard} → {to.shard}
                <br />
                {to.totalDelay ? `Delay: ${to.totalDelay * 7}s-${to.totalDelay * 9}s` : ''}
              </span>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
