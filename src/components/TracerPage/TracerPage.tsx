import { useEffect, useState, useCallback } from 'react'
import { DeserializeTransactionsList } from '@/utils/txSerializer'
import { FileUploadArea } from './FileUploadArea'
import { GraphDisplay } from './GraphDisplay'
import { Button } from '@/components/ui/button'
import {
  addTracerItem,
  useTracerItems,
  useActiveItemId,
  setActiveItem,
  removeTracerItem,
  renameTracerItem,
  clearTracerState,
  useGraphData,
} from '@/store/tracerState'
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
import { faDownload, faTrash, faPen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { ParsedTransaction } from '@/utils/ManagedBlockchain'
import { Input } from '@/components/ui/input'

export function TracerPage() {
  const isLoading = false
  const [error, setError] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string>('')
  const location = useLocation()

  // Get global state
  const graphData = useGraphData({ noproxy: true })
  const tracerItems = useTracerItems()
  const activeItemId = useActiveItemId()
  const activeHash = useActiveHash()
  const tracerTransactions = useTracerTransactions()
  const traceLoading = useTraceLoading()
  const traceProgress = useTraceProgress()
  const traceError = useTraceError()

  useEffect(() => {
    console.log('tracerItems', tracerItems.get())
  }, [tracerItems])

  useEffect(() => {
    console.log('graphData', graphData)
  }, [graphData])

  // Handle trace ID from location state (from clipboard)
  useEffect(() => {
    const fetchTraceData = async (trace: string) => {
      try {
        setError(null)
        const traceString = Buffer.from(trace, 'base64').toString('utf-8')
        const data = DeserializeTransactionsList(traceString)
        addTracerItem('Clipboard Trace', data)
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
    const timestamp = new Date().toLocaleTimeString()
    addTracerItem(`File Upload (${timestamp})`, data)
  }

  const handleClearGraph = () => {
    clearTracerState()
    clearRemoteTracerState()
    setError(null)
  }

  const handleItemSelect = (id: string) => {
    setActiveItem(id)
  }

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeTracerItem(id)
  }

  const handleStartEditName = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingItemId(id)
    setEditingName(currentName)
  }

  const handleSaveItemName = (id: string) => {
    if (editingName.trim()) {
      renameTracerItem(id, editingName.trim())
    }
    setEditingItemId(null)
  }

  // Use remote tracer transactions when available
  const displayData = activeHash.get()
    ? { transactions: [...tracerTransactions.get({ noproxy: true })] }
    : graphData
      ? { transactions: graphData.transactions as unknown as ParsedTransaction[] }
      : null

  useEffect(() => {
    console.log('displayData', displayData)
  }, [displayData])

  const handleDownloadGraph = useCallback(async () => {
    if (displayData?.transactions) {
      await downloadGraph(displayData.transactions as any[])
    }
  }, [displayData])

  return (
    <div className="w-full mx-auto ">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Transaction Tracer</h1>
        {tracerItems.get()?.length > 0 && (
          <Button variant="outline" onClick={handleClearGraph}>
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-1 border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Tracer Sets</h2>
          {tracerItems.get()?.length === 0 ? (
            <div className="text-muted-foreground text-sm">No tracer sets available</div>
          ) : (
            <div className="space-y-2">
              {tracerItems.get().map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'p-3 rounded-md cursor-pointer flex justify-between items-center',
                    activeItemId.get() === item.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                  onClick={() => handleItemSelect(item.id)}
                >
                  {editingItemId === item.id ? (
                    <div className="flex-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleSaveItemName(item.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveItemName(item.id)}
                        autoFocus
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <span className="flex-1 truncate">{item.name}</span>
                  )}
                  <div className="flex gap-2 ml-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => handleStartEditName(item.id, item.name, e)}
                    >
                      <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive"
                      onClick={(e) => handleRemoveItem(item.id, e)}
                    >
                      <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={cn('md:col-span-3', {
            hidden: tracerItems.get()?.length > 0 && activeItemId.get() !== null,
          })}
        >
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Trace File</h2>
            <FileUploadArea onFileProcessed={handleFileProcessed} />

            <h2 className="text-xl font-semibold mb-4 mt-6">Emulate transaction from chain</h2>
            <RemoteTracerViewer />
          </div>
        </div>

        {isLoading ? (
          <div className="md:col-span-3 text-center py-8">
            <div className="text-lg mb-2">Loading trace data...</div>
          </div>
        ) : error ? (
          <div className="md:col-span-3 text-center py-8">
            <div className="text-lg text-destructive mb-2">{error}</div>
          </div>
        ) : (
          displayData &&
          activeItemId.get() && (
            <div className="md:col-span-3">
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
            </div>
          )
        )}
      </div>
    </div>
  )
}
