import { memo, useCallback, useEffect, useRef } from 'react'
import {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  ReactFlowInstance,
  ReactFlow,
  Handle,
  Position,
} from '@xyflow/react'
import ELK from 'elkjs/lib/elk.bundled'

import '@xyflow/react/dist/style.css'
import { TxEdge } from './TxEdge'
import { TxNode } from './TxNode'
import { ParsedTransaction } from '@/utils/ManagedBlockchain'
import { Address } from '@ton/core'
import { bigIntToBuffer } from '@/utils/ton'
import { checkForJettonPayload } from '@/utils/jettonPayload'
import { formatUnits } from '@/utils/units'

export type GraphTx = ParsedTransaction & { id: number }

export interface TxNodeData {
  label: string
  tx: GraphTx
  rootTx: GraphTx
  addresses: string[] // list of all addresses in the trace
}

export interface OriginNodeData {
  amount: bigint
  src: Address | undefined
}

// Node representing the external originator (e.g. relayer for signMessage emulation)
// that delivers the first internal message with attached gas.
const OriginNode = memo(({ data }: { data: OriginNodeData }) => {
  return (
    <div className="relative p-4 rounded-lg border-2 border-dashed border-amber-500/70 bg-amber-950/90 text-amber-100 shadow-lg">
      <div className="font-medium mb-1">Relayer (emulated)</div>
      <div className="text-xs text-amber-100/70 mb-2">
        Assumed sender delivering the signed message with gas
      </div>
      <div className="text-sm font-medium">{formatUnits(data.amount, 9)} TON</div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        draggable={false}
        className="w-3 h-3 bg-secondary border-2 border-background"
        id="a"
      />
    </div>
  )
})

const nodeTypes = {
  tx: TxNode,
  origin: OriginNode,
}

const edgeTypes = {
  tx: TxEdge,
}

const ORIGIN_NODE_ID = 'origin'

export interface MessageFlowProps {
  transactions: ParsedTransaction[] | undefined
}

export function MessageFlow({ transactions: _txes }: MessageFlowProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const instanceRef = useRef<ReactFlowInstance<any, any> | null>(null)

  const onLoad = (reactFlowInstance: ReactFlowInstance<any, any>) => {
    instanceRef.current = reactFlowInstance
  }

  useEffect(() => {
    if (!_txes?.length) {
      return
    }

    const addressesSet = new Set<string>()

    const transactions = _txes as GraphTx[]
    for (let i = 0; i < transactions?.length; i++) {
      transactions[i].id = i
      const address = transactions[i].address
      addressesSet.add(
        new Address(0, address ? bigIntToBuffer(address) : Buffer.alloc(32)).toRawString()
      )
    }

    const addresses = [...addressesSet]

    const nodes: Node<any, string>[] = []
    const edges: Edge<any>[] = []

    const elk = new ELK()
    const graph: {
      id: string
      layoutOptions: any
      children: { id: string; width: number; height: number }[]
      edges: {
        id: string
        sources: string[]
        targets: string[]
      }[]
    } = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'org.eclipse.elk.spacing.nodeNode': 10,
        'elk.layered.spacing.nodeNodeBetweenLayers': '250',
      },
      children: [],
      edges: [],
    }
    if (transactions.length === 1) {
      graph.children.push({
        id: transactions[0].id.toString(),
        width: 400,
        height: getTxHeight(transactions[0]),
      })
    } else {
      for (const tx of transactions.filter((tx) => !tx.parent)) {
        graph.children.push({
          id: tx.id.toString(),
          width: 400,
          height: getTxHeight(tx),
        })
        const children: GraphTx[][] = [tx.children as GraphTx[]]
        const parent = [tx]

        while (children.length > 0) {
          const locChildren = children.pop()
          const locParent = parent.pop()

          if (!locChildren?.length) {
            return
          }

          for (const childTx of locChildren) {
            if (!childTx.id) {
              continue
            }
            graph.children.push({
              id: childTx.id.toString(),
              width: 400,
              height: getTxHeight(childTx),
            })

            graph.edges.push({
              id: `edge-${locParent?.id}-${childTx.id}`,
              sources: [locParent?.id?.toString() || '0'],
              targets: [childTx.id.toString()],
            })
            if (childTx.children.length > 0) {
              children.push(childTx.children as GraphTx[])
              parent.push(childTx)
            }
          }
        }
      }
    }

    elk
      .layout(graph, {
        layoutOptions: {},
      })
      .then((elkG) => {
        if (!elkG || !elkG.children || !elkG.edges) {
          return
        }
        for (const node of elkG.children) {
          const tx = transactions.find((t) => t.id === parseInt(node.id))
          nodes.push({
            id: node.id,
            position: { x: node.x || 0, y: node.y || 0 },
            data: {
              label: node.id.toString(),
              tx,
              rootTx: transactions[0],
              addresses,
            },
            style: {
              width: 400,
            },
            type: 'tx',
          })
        }

        for (const edge of elkG.edges) {
          edges.push({
            id: edge.id,
            source: edge.sources[0],
            target: edge.targets[0],
            data: {
              from: transactions.find((t) => t.id === parseInt(edge.sources[0])),
              to: transactions.find((t) => t.id === parseInt(edge.targets[0])),
              rootTx: transactions[0],
            },
            type: 'tx',
          })
        }

        // If the root transaction was triggered by an internal message (signMessage
        // emulation), add a synthetic node for the originator that carries the gas.
        const rootTx = transactions.find((t) => !t.parent) || transactions[0]
        const rootInMessage = rootTx?.inMessage
        if (rootInMessage?.info.type === 'internal') {
          const rootNode = nodes.find((n) => n.id === rootTx.id.toString())
          if (rootNode) {
            nodes.push({
              id: ORIGIN_NODE_ID,
              position: { x: rootNode.position.x - 500, y: rootNode.position.y },
              data: {
                amount: rootInMessage.info.value.coins,
                src: rootInMessage.info.src instanceof Address ? rootInMessage.info.src : undefined,
              },
              style: {
                width: 300,
              },
              type: 'origin',
            })
            edges.push({
              id: `edge-${ORIGIN_NODE_ID}-${rootTx.id}`,
              source: ORIGIN_NODE_ID,
              target: rootTx.id.toString(),
              label: `${formatUnits(rootInMessage.info.value.coins, 9)} TON`,
            })
          }
        }

        setNodes(nodes as any)
        setEdges(edges as any)
        setTimeout(() => {
          instanceRef.current?.fitView()
        }, 64)
        // console.log('set nodes', nodes.length)
      })
  }, [_txes, _txes?.length, instanceRef])

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds) as any),
    [setEdges]
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      minZoom={0.1}
      fitView
      onInit={onLoad as any}
    >
      <Controls />
      <Background />
    </ReactFlow>
  )
}

function getTxHeight(tx: ParsedTransaction) {
  let start = 500
  if (isTxError(tx)) {
    start += 50
  }

  if (tx?.parsed?.internal === 'jetton_transfer') {
    start += 150
  }

  if (checkForJettonPayload(tx?.parsed)) {
    start += 250
  }

  if (tx?.parsedRaw) {
    start += 250
  }

  return start
}

function isTxError(tx: ParsedTransaction) {
  const isError =
    (tx.description?.type === 'generic' &&
      tx.description?.computePhase?.type === 'vm' &&
      tx.description?.computePhase?.exitCode !== 0) ||
    (tx.description.type === 'generic' &&
      tx.description?.actionPhase &&
      tx.description?.actionPhase?.resultCode !== 0) ||
    (tx.description?.type === 'generic' && tx.description.bouncePhase?.type)

  return isError
}
