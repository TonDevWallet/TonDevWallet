import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload } from '@fortawesome/free-solid-svg-icons'
import { useCallback } from 'react'
import { GraphDisplay } from './GraphDisplay'
import { ParsedTransaction } from '@/utils/ManagedBlockchain'
import { downloadGraph } from '@/utils/graphDownloader'
import {
  useActiveHash,
  useTraceLoading,
  useTraceProgress,
  useTraceError,
} from '@/store/remoteTracerState'

interface TracerContentProps {
  transactions: ParsedTransaction[]
}

export function TracerContent({ transactions }: TracerContentProps) {
  const activeHash = useActiveHash()
  const traceLoading = useTraceLoading()
  const traceProgress = useTraceProgress()
  const traceError = useTraceError()

  const handleDownloadGraph = useCallback(async () => {
    if (transactions) {
      await downloadGraph(transactions as any[])
    }
  }, [transactions])

  return (
    <div className="flex flex-col gap-4">
      {activeHash.get() && (
        <div className="bg-muted p-4 rounded-lg border">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">
              Tracing: {activeHash.get()?.slice(0, 10) + '...' + activeHash.get()?.slice(-10)}
            </h3>
            <div className="flex items-center gap-2">
              {traceLoading.get() && (
                <div className="text-sm text-muted-foreground flex items-center">
                  Loading {traceProgress.loaded.get()} of {traceProgress.total.get()} transactions
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
      <GraphDisplay transactions={transactions} />
    </div>
  )
}
