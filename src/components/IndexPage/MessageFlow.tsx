import { BlockchainTransaction } from '@/utils/ManagedBlockchain'
import { useCallback, useEffect } from 'react'
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
} from 'reactflow'
import ELK from 'elkjs/lib/elk.bundled'

import 'reactflow/dist/style.css'
import { TxEdge } from './TxEdge'
import { TxNode } from './TxNode'

export type GraphTx = BlockchainTransaction & { id: number }

export interface TxNodeData {
  label: string
  tx: GraphTx
  rootTx: GraphTx
}

const nodeTypes = {
  tx: TxNode,
}

const edgeTypes = {
  tx: TxEdge,
}

export function MessageFlow({
  transactions: _txes,
}: {
  transactions: BlockchainTransaction[] | undefined
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const transactions = _txes as GraphTx[]
  for (let i = 0; i < transactions?.length; i++) {
    transactions[i].id = i
  }

  useEffect(() => {
    if (!transactions) {
      return
    }

    const nodes: Node<any, string | undefined>[] = []
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
      layoutOptions: { 'elk.algorithm': 'mrtree' },
      children: [],
      edges: [],
    }
    for (const tx of transactions.filter((tx) => !tx.parent)) {
      graph.children.push({
        id: tx.id.toString(),
        width: 400,
        height: 200,
      })
      const children: GraphTx[][] = [tx.children as GraphTx[]]
      const parent = [tx]

      while (children.length > 0) {
        const locChildren = children.pop()
        const locParent = parent.pop()

        if (!locChildren) {
          return
        }

        for (const childTx of locChildren) {
          graph.children.push({
            id: childTx.id.toString(),
            width: 400,
            height: 200,
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

    elk
      .layout(graph, {
        layoutOptions: {},
      })
      .then((elkG) => {
        if (!elkG || !elkG.children || !elkG.edges) {
          return
        }
        for (const node of elkG.children) {
          nodes.push({
            id: node.id,
            position: { x: node.x || 0, y: node.y || 0 },
            data: {
              label: node.id.toString(),
              tx: transactions.find((t) => t.id === parseInt(node.id)),
              rootTx: transactions[0],
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

        setNodes(nodes)
        setEdges(edges)
      })
  }, [_txes])

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges])

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
    >
      <Controls />
      <Background />
    </ReactFlow>
  )
}
