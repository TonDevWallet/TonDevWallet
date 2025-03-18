import { setTransactionState, useTransactionState } from '@/store/txInfo'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useState, useMemo } from 'react'
import { Cell, loadTransaction } from '@ton/core'
import { VmLogsInfo } from './VmLogsInfo'
import { VmStackInfo } from './VmStackInfo'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faCircleExclamation, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { StackInfo } from '@/hooks/useVmLogsNavigation'
import { KeyboardShortcutHint } from './KeyboardShortcutHint'

export function TxInfoPage() {
  const transactionState = useTransactionState()
  const [filterText, setFilterText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stack, setStack] = useState<StackInfo>({
    old: '',
    new: '',
    i: -1,
  })

  // Parse the logs to determine if data is available
  const hasLogData = useMemo(() => {
    const vmLogs = transactionState.vmLogs.get()
    return vmLogs && vmLogs.includes('stack:')
  }, [transactionState.vmLogs])

  // Auto-select first line when logs are loaded
  useEffect(() => {
    if (hasLogData && stack.i === -1 && !isLoading) {
      // Get the first command from logs
      const vmLogs = transactionState.vmLogs.get()
      const instructions = vmLogs.split('stack: ').slice(1)

      if (instructions.length > 0) {
        const lines = instructions[0].split('\n').filter((l) => l)
        const firstStack = lines[0]
        const secondStack = instructions[1]?.split('\n').filter((l) => l)[0] || ''

        setStack({
          old: firstStack,
          new: secondStack,
          i: 0,
        })
      }
    }
  }, [hasLogData, stack.i, isLoading, transactionState.vmLogs])

  useEffect(() => {
    const unsubscribe = listen(
      'txinfo',
      ({
        payload,
      }: {
        payload: {
          tx: string
          vmLogs: string
          debugLogs: string
          blockchainLogs: string
        }
      }) => {
        setIsLoading(true)
        try {
          console.log('tx info listen', payload)
          setTransactionState({
            tx: loadTransaction(Cell.fromBase64(payload.tx).asSlice()),
            vmLogs: payload.vmLogs,
            debugLogs: payload.debugLogs,
            blockchainLogs: payload.blockchainLogs,
          })
          setError(null)
        } catch (err) {
          setError(
            `Error processing transaction: ${err instanceof Error ? err.message : String(err)}`
          )
        } finally {
          setIsLoading(false)
        }
      }
    )

    return () => {
      unsubscribe.then((fn) => fn())
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 gap-2
          flex flex-row items-center justify-between
      "
      >
        <h1 className="text-xl font-semibold text-foreground w-64">Transaction Details</h1>

        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            <FontAwesomeIcon icon={faSearch} size="sm" />
          </div>
          <input
            type="text"
            placeholder="Filter VM commands..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full py-2 pl-10 pr-3 rounded-lg bg-input border border-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-destructive/10 border border-destructive rounded-lg flex items-center gap-2 text-destructive">
          <FontAwesomeIcon icon={faCircleExclamation} size="sm" />
          <p>{error}</p>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex justify-center items-center h-12 m-4">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          <span className="ml-2 text-muted-foreground">Processing transaction...</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* VM Logs Panel */}
        <div className="w-full md:w-[40%] flex flex-col h-full overflow-hidden border-r border-border">
          <div className="flex-none bg-secondary/30 border-b border-border p-3">
            <h2 className="font-medium text-foreground">VM Execution Log</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <VmLogsInfo
              logs={transactionState.vmLogs.get()}
              setStack={setStack}
              filterText={filterText}
              selectedStack={stack.i}
            />
          </div>
        </div>

        {/* Stack Comparison Panel */}
        <div className="w-full md:w-[60%] flex flex-col h-full overflow-hidden">
          <div className="grid grid-cols-2 flex-none">
            <div className="p-3 bg-secondary/30 border-r border-border">
              <h2 className="font-medium text-foreground">Stack Before</h2>
            </div>
            <div className="p-3 bg-secondary/30">
              <h2 className="font-medium text-foreground">Stack After</h2>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <VmStackInfo stack={stack} />
          </div>

          {stack.i === -1 && (
            <div className="absolute inset-0 md:inset-auto md:right-0 md:w-[60%] md:top-[109px] md:bottom-0 flex flex-col items-center justify-center h-full text-muted-foreground p-6 z-10 pointer-events-none">
              <div className="mb-3 flex justify-center">
                <FontAwesomeIcon icon={faArrowRight} size="2x" />
              </div>
              <p className="text-center">Select a command from the VM log to view stack changes</p>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcut Hint */}
      {hasLogData && <KeyboardShortcutHint />}
    </div>
  )
}
