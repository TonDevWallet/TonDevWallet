import { setTransactionState, useTransactionState } from '@/store/txInfo'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useState, useMemo, useRef } from 'react'
import { Cell, loadTransaction, Transaction } from '@ton/core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faCircleExclamation } from '@fortawesome/free-solid-svg-icons'
import { StackInfo } from '@/hooks/useVmLogsNavigation'
import { KeyboardShortcutHint } from './KeyboardShortcutHint'
import { RawTransactionInfo } from './RawTransactionInfo'
import { TxStackInfo } from './TxStackInfo'
import { BlockchainLogsInfo } from './BlockchainLogsInfo'

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
  const [activeTab, setActiveTab] = useState<'stack' | 'logs' | 'raw'>('stack')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Parse the logs to determine if data is available
  const hasLogData = useMemo(() => {
    const vmLogs = transactionState.vmLogs.get()
    return vmLogs && vmLogs.includes('stack:')
  }, [transactionState.vmLogs])

  // Focus search input on page load
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  // Keyboard shortcut for focusing search input (Ctrl+/ or Cmd+/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        if (searchInputRef.current) {
          searchInputRef.current.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

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
        className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 gap-4
          flex flex-row items-center
      "
      >
        <h1 className="text-xl font-semibold text-foreground flex-shrink-0">Transaction Details</h1>

        {/* Tabs */}
        <div className="flex flex-shrink-0">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'stack'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('stack')}
          >
            Stack
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'logs'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('logs')}
          >
            Logs
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'raw'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('raw')}
          >
            Raw
          </button>
        </div>

        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            <FontAwesomeIcon icon={faSearch} size="sm" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Filter VM commands... (Ctrl+/ or Cmd+/)"
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
      {activeTab === 'stack' ? (
        <TxStackInfo filterText={filterText} />
      ) : activeTab === 'logs' ? (
        <BlockchainLogsInfo logs={transactionState.blockchainLogs.get()} />
      ) : (
        <RawTransactionInfo tx={transactionState.tx.get() as Transaction} />
      )}

      {/* Keyboard Shortcut Hint */}
      {hasLogData && activeTab === 'stack' && <KeyboardShortcutHint />}
    </div>
  )
}
