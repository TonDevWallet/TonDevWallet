import { useState } from 'react'
import { DeserializeTransactionsList } from '@/utils/txSerializer'
import { FileUploadArea } from './FileUploadArea'
import { GraphDisplay } from './GraphDisplay'
import { Button } from '@/components/ui/button'

export function TracerPage() {
  const [graphData, setGraphData] = useState<any>(null)

  const handleFileProcessed = (jsonData: any) => {
    const data = DeserializeTransactionsList(JSON.stringify(jsonData))
    setGraphData(data)
  }

  const handleClearGraph = () => {
    setGraphData(null)
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
        <GraphDisplay transactions={graphData.transactions} />
      )}
    </div>
  )
}
