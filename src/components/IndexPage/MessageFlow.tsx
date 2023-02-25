import { BlockchainTransaction } from '@/utils/ManagedBlockchain'
import { useCallback, useEffect } from 'react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
} from 'reactflow'

import 'reactflow/dist/style.css'

const initialNodes = [
  // { id: '1', position: { x: 0, y: 0 }, data: { label: '1' } },
  // { id: '2', position: { x: 0, y: 100 }, data: { label: '2' } },
]

const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }]

export function MessageFlow({
  transactions,
}: {
  transactions: BlockchainTransaction[] | undefined
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    if (!transactions) {
      return
    }
    const nodes: Node<any, string | undefined>[] = []

    // let txes = [...transactions]
    // while (txes.length) {}
    let i = 1
    for (const tx of transactions.filter((tx) => !tx.parent)) {
      nodes.push({
        id: i.toString(),
        position: { x: 0, y: i * 100 },
        data: { label: i.toString() },
      })
      i++

      const children: BlockchainTransaction[][] = [tx.children]
      const parent = [tx]

      while (children.length > 0) {
        const locChildren = children.pop()
        const locParent = parent.pop()

        if (!locChildren) {
          return
        }

        for (const childTx of locChildren) {
          // children.pop()
          nodes.push({
            id: i.toString(),
            position: { x: 0, y: i * 100 },
            data: { label: i.toString() },
          })
          i++

          if (childTx.children.length > 0) {
            children.push(childTx.children)
            parent.push(childTx)
          }
          console.log('i+')
        }
      }
    }
    setNodes(nodes)
  }, [transactions])

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
    >
      {/* <MiniMap /> */}
      <Controls />
      <Background />
    </ReactFlow>
  )
}
