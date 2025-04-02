import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTraceData } from '@/hooks/useTraceData'
import { setSelectedTx } from '@/store/tracerState'
import {
  useTxHash,
  useActiveHash,
  setTxHash,
  setActiveHash,
  setTracerTransactions,
  setTraceLoading,
  setTraceProgress,
  setTraceError,
  useTraceLoading,
  useTraceProgress,
  useTraceError,
  clearRemoteTracerState,
} from '@/store/remoteTracerState'

export function RemoteTracerViewer() {
  // Use global state instead of local state
  const txHash = useTxHash()
  const activeHash = useActiveHash()
  const traceLoading = useTraceLoading()
  const traceProgress = useTraceProgress()
  const traceError = useTraceError()

  // Keep track of previous transaction length to avoid infinite updates
  const prevTransactionsLength = useRef(0)

  const {
    transactions,
    loading: loadingState,
    progress: progressState,
    error: errorState,
    abort: abortTraceLoading,
  } = useTraceData(activeHash.get())

  // When tracing state changes, update the global store
  useEffect(() => {
    setTraceLoading(loadingState)
    setTraceProgress(progressState)
    setTraceError(errorState)
  }, [loadingState, progressState, errorState])

  // When transactions change, update the global store
  useEffect(() => {
    // Only update store if the transaction count has changed
    if (transactions.length > 0 && transactions.length !== prevTransactionsLength.current) {
      prevTransactionsLength.current = transactions.length
      setTracerTransactions(transactions)
    } else if (transactions.length === 0 && prevTransactionsLength.current > 0) {
      // Reset if transactions are cleared
      prevTransactionsLength.current = 0
      setTracerTransactions([])
    }
  }, [transactions])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (txHash.get().trim()) {
      setActiveHash(txHash.get().trim())
    }
  }

  const handleClear = () => {
    clearRemoteTracerState()
    setSelectedTx(null)
    prevTransactionsLength.current = 0
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <Input
          type="text"
          value={txHash.get()}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="Enter transaction hash"
          className="flex-1"
        />
        <Button type="submit" disabled={!txHash.get().trim() || traceLoading.get()}>
          Trace
        </Button>
        {activeHash.get() && (
          <Button variant="outline" onClick={handleClear} disabled={traceLoading.get()}>
            Clear
          </Button>
        )}
      </form>

      {traceError.get() && <div className="text-red-500 mb-4">{traceError.get()}</div>}

      {activeHash.get() && (
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Active Trace: {activeHash.get()}</h3>
          <div className="flex items-center mb-2">
            <div className="flex-1">
              <p>
                Loaded {traceProgress.loaded.get()} of {traceProgress.total.get()} transactions
              </p>
            </div>
            {traceLoading.get() && (
              <Button variant="destructive" size="sm" onClick={abortTraceLoading}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
