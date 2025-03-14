import { useEffect, useState } from 'react'
import { DeserializeTransactionsList } from '@/utils/txSerializer'
import { FileUploadArea } from './FileUploadArea'
import { GraphDisplay } from './GraphDisplay'
import { Button } from '@/components/ui/button'
import { TxInfo } from './TxInfo'
import { useSelectedTx, setSelectedTx } from '@/store/tracerState'
import { useLocation } from 'react-router-dom'

interface GraphData {
  transactions: any[]
}

export function TracerPage() {
  const isLoading = false
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  // const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedTx = useSelectedTx()
  const location = useLocation()

  // Handle trace ID from location state (from clipboard)
  useEffect(() => {
    const fetchTraceData = async (trace: string) => {
      try {
        setError(null)
        const traceString = Buffer.from(trace, 'base64').toString('utf-8')
        const data = DeserializeTransactionsList(traceString)
        setGraphData(data)
      } catch (error) {
        console.error('Error fetching trace data:', error)
        setError('Failed to load trace data. Please try again.')
      }
      //   setIsLoading(true)
      //   setError(null)
      //   try {
      //     // Fetch trace data from server using the trace ID
      //     const response = await tFetch<any>(`https://trace.tondevwallet.io/api/traces/${traceId}`, {
      //       method: 'GET',
      //       timeout: { secs: 10, nanos: 0 },
      //     })

      //     if (response.status !== 200 || !response.data) {
      //       throw new Error('Failed to fetch trace data')
      //     }

      //     // Process the data and set it for visualization
      //     const data = DeserializeTransactionsList(JSON.stringify(response.data))
      //     setGraphData(data)
      //   } catch (error) {
      //     console.error('Error fetching trace data:', error)
      //     setError('Failed to load trace data. Please try again.')
      //   } finally {
      //     setIsLoading(false)
      //   }
      // }

      // Check if traceId is passed in location state
    }
    const traceId = location.state?.traceId
    if (traceId) {
      fetchTraceData(traceId)
    }
  }, [location.state])

  const handleFileProcessed = (jsonData: any) => {
    const data = DeserializeTransactionsList(JSON.stringify(jsonData))
    setGraphData(data)
  }

  const handleClearGraph = () => {
    setGraphData(null)
    setSelectedTx(null)
    setError(null)
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

      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-lg mb-2">Loading trace data...</div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-lg text-red-500 mb-2">{error}</div>
          <FileUploadArea onFileProcessed={handleFileProcessed} />
        </div>
      ) : !graphData ? (
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
