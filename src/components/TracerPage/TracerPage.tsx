import { useState } from 'react'
import { DeserializeTransactionsList } from '@/utils/txSerializer'
import { FileUploadArea } from './FileUploadArea'
import { GraphDisplay } from './GraphDisplay'
import { Button } from '@/components/ui/button'
import { TxInfo } from './TxInfo'
import { useSelectedTx, setSelectedTx } from '@/store/tracerState'

interface GraphData {
  transactions: any[]
}

export function TracerPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const selectedTx = useSelectedTx()

  const handleFileProcessed = (jsonData: any) => {
    const data = DeserializeTransactionsList(JSON.stringify(jsonData))
    setGraphData(data)
  }

  const handleClearGraph = () => {
    setGraphData(null)
    setSelectedTx(null)
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Transaction Tracer</h1>
        {graphData && (
          <Button variant="outline" onClick={handleClearGraph}>
            Clear Graph
          </Button>
        )}
      </div>

      {!graphData ? (
        <FileUploadArea onFileProcessed={handleFileProcessed} />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">Transaction Graph</h2>
            <GraphDisplay transactions={graphData.transactions} />
          </div>
          <TxInfo tx={selectedTx.value} />
        </>
      )}
    </div>
  )
}
