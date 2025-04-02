import { useEffect, useState, useCallback } from 'react'
import { DeserializeTransactionsList } from '@/utils/txSerializer'
import { FileUploadArea } from './FileUploadArea'
import { GraphDisplay } from './GraphDisplay'
import { Button } from '@/components/ui/button'
import { setSelectedTx } from '@/store/tracerState'
import { useLocation } from 'react-router-dom'
import { RemoteTracerViewer } from './RemoteTracerViewer'
import {
  clearRemoteTracerState,
  useActiveHash,
  useTracerTransactions,
  useTraceLoading,
  useTraceProgress,
  useTraceError,
} from '@/store/remoteTracerState'
import { cn } from '@/utils/cn'
import { downloadGraph } from '@/utils/graphDownloader'
import { faDownload } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface GraphData {
  transactions: any[]
}

export function TracerPage() {
  const isLoading = false
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()

  // Get all remote tracer state
  const activeHash = useActiveHash()
  const tracerTransactions = useTracerTransactions()
  const traceLoading = useTraceLoading()
  const traceProgress = useTraceProgress()
  const traceError = useTraceError()

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
    clearRemoteTracerState()
    setError(null)
  }

  // Use remote tracer transactions when available
  const displayData = activeHash.get()
    ? { transactions: [...tracerTransactions.get({ noproxy: true })] }
    : graphData

  const handleDownloadGraph = useCallback(async () => {
    if (displayData?.transactions) {
      await downloadGraph(displayData.transactions)
    }
  }, [displayData])

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Transaction Tracer</h1>
        {displayData && (
          <Button variant="outline" onClick={handleClearGraph}>
            Clear Graph
          </Button>
        )}
      </div>

      <div
        className={cn({
          hidden: isLoading || displayData,
        })}
      >
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Trace File</h2>
            <FileUploadArea onFileProcessed={handleFileProcessed} />

            <h2 className="text-xl font-semibold mb-4">Emulate transaction from chain</h2>
            <RemoteTracerViewer />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-lg mb-2">Loading trace data...</div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-lg text-destructive mb-2">{error}</div>
          <FileUploadArea onFileProcessed={handleFileProcessed} />
        </div>
      ) : (
        displayData && (
          <>
            <div className="flex flex-col gap-4">
              {activeHash.get() && (
                <div className="bg-muted p-4 rounded-lg border">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">
                      Tracing:{' '}
                      {activeHash.get()?.slice(0, 10) + '...' + activeHash.get()?.slice(-10)}
                    </h3>
                    <div className="flex items-center gap-2">
                      {traceLoading.get() && (
                        <div className="text-sm text-muted-foreground flex items-center">
                          Loading {traceProgress.loaded.get()} of {traceProgress.total.get()}{' '}
                          transactions
                        </div>
                      )}
                      <Button variant="outline" size="sm" onClick={handleDownloadGraph}>
                        <FontAwesomeIcon icon={faDownload} className="mr-2" />
                        Download Graph
                      </Button>
                    </div>
                  </div>
                  {traceError.get() && (
                    <div className="text-destructive text-sm mt-2">{traceError.get()}</div>
                  )}
                </div>
              )}
              <GraphDisplay transactions={displayData.transactions} />
            </div>
          </>
        )
      )}
    </div>
  )
}
