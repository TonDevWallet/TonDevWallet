import { useEffect, useState } from 'react'
import { DeserializeTransactionsList } from '@/utils/txSerializer'
import { addTracerItem, useTracerItems, useActiveItemId, useGraphData } from '@/store/tracerState'
import { useLocation } from 'react-router-dom'
import { useActiveHash, useTracerTransactions } from '@/store/remoteTracerState'
import { ParsedTransaction } from '@/utils/ManagedBlockchain'
import { TracerHeader } from './TracerHeader'
import { TracerTabs } from './TracerTabs'
import { TracerUploadArea } from './TracerUploadArea'
import { TracerContent } from './TracerContent'

export function TracerPage() {
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()

  // Get global state
  const graphData = useGraphData({ noproxy: true })
  const tracerItems = useTracerItems()
  const activeItemId = useActiveItemId()
  const activeHash = useActiveHash()
  const tracerTransactions = useTracerTransactions()

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

  // Use remote tracer transactions when available
  const displayData = activeHash.get()
    ? { transactions: [...tracerTransactions.get({ noproxy: true })] }
    : graphData
      ? { transactions: graphData.transactions as unknown as ParsedTransaction[] }
      : null

  const hasActiveTrace = tracerItems.get()?.length > 0 && activeItemId.get() !== null
  const showUploadArea = !hasActiveTrace

  return (
    <div className="w-full mx-auto h-full flex flex-col">
      <TracerHeader />

      <TracerTabs />

      <div className="flex-1 mt-4 overflow-hidden flex flex-col pb-8">
        {error && (
          <div className="text-destructive p-4 border border-destructive/20 bg-destructive/10 rounded-lg mb-4">
            {error}
          </div>
        )}

        {showUploadArea ? (
          <TracerUploadArea />
        ) : (
          displayData && <TracerContent transactions={displayData.transactions} />
        )}
      </div>
    </div>
  )
}
