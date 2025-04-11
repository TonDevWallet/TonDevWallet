import { Button } from '../ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { cn } from '@/utils/cn'
import { useState, useEffect } from 'react'
import { fetch as tFetch } from '@tauri-apps/plugin-http'
import { LiteClient, LiteRoundRobinEngine, LiteSingleEngine } from 'ton-lite-client'
import { tauriState } from '@/store/tauri'
import { LSConfigData } from '@/types/network'

export type TestStatus = 'idle' | 'loading' | 'success' | 'error'

export interface TestStatusState {
  status: TestStatus
  message?: string
}

// NetworkTestButton component
interface NetworkTestButtonProps {
  url: string
}

// Helper function to create a timeout promise
const timeout = (ms: number) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
  })
}

const NetworkTestButton = ({ url }: NetworkTestButtonProps) => {
  const [testStatus, setTestStatus] = useState<TestStatusState>({ status: 'idle' })

  // Reset test status after 5 seconds when test completes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined

    if (testStatus.status === 'success' || testStatus.status === 'error') {
      timeoutId = setTimeout(() => {
        setTestStatus({ status: 'idle' })
      }, 5000) // 5 seconds
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [testStatus.status])

  const testNetworkConnection = async () => {
    setTestStatus({ status: 'loading' })

    try {
      // Fetch the liteserver configuration
      const response = await tFetch(url)
      const data = (await response.json()) as LSConfigData

      if (!data || !data.liteservers || data.liteservers.length === 0) {
        setTestStatus({
          status: 'error',
          message: 'Invalid configuration: No liteservers found',
        })
        return
      }

      // Create a temporary engine to test connection
      const engine = new LiteRoundRobinEngine([])
      const client = new LiteClient({ engine })

      // Get tauri state for WebSocket connection
      const tauri = (await tauriState.promise) || tauriState
      if (!tauri) {
        throw new Error('Tauri state not available')
      }

      // Try to connect to at least one liteserver
      for (const liteserver of data.liteservers) {
        const pubkey = encodeURIComponent(liteserver.id.key)
        const singleEngine = new LiteSingleEngine({
          host: `ws://localhost:${tauri.port.get()}/?ip=${liteserver.ip}&port=${liteserver.port}&pubkey=${pubkey}`,
          publicKey: Buffer.from(liteserver.id.key, 'base64'),
          client: 'ws',
        })

        engine.addSingleEngine(singleEngine)
      }

      // Test connection by getting masterchain info with 5 second timeout
      try {
        // Race between the API call and a 5-second timeout
        const masterchainInfo = (await Promise.race([
          client.getMasterchainInfo(),
          timeout(5000), // 5 second timeout
        ])) as Awaited<ReturnType<typeof client.getMasterchainInfo>>

        setTestStatus({
          status: 'success',
          message: `Connected successfully (seqno: ${masterchainInfo.last.seqno})`,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        setTestStatus({
          status: 'error',
          message: `Connection failed: ${errorMessage}`,
        })
      }

      // Clean up
      engine.close()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setTestStatus({
        status: 'error',
        message: `Error: ${errorMessage}`,
      })
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-10 w-16 flex items-center justify-center',
              testStatus.status === 'success'
                ? 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-800'
                : '',
              testStatus.status === 'error'
                ? 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-800'
                : ''
            )}
            onClick={(e) => {
              e.preventDefault()
              testNetworkConnection()
            }}
            disabled={testStatus.status === 'loading'}
          >
            {testStatus.status === 'loading' && (
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            )}
            {testStatus.status === 'success' && <FontAwesomeIcon icon={faCheck} />}
            {testStatus.status === 'error' && <FontAwesomeIcon icon={faXmark} />}
            {testStatus.status === 'idle' ? 'Test' : null}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {testStatus.status === 'loading'
            ? 'Testing connection...'
            : testStatus.message
              ? testStatus.message
              : 'Test connection to network'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default NetworkTestButton
