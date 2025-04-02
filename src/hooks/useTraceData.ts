import { useState, useEffect, useRef } from 'react'
import { useLiteclient, useLiteclientState } from '@/store/liteClient'
import { getEmulationWithStack } from '@/utils/retracer/retracer'
import { ToncenterV3TraceNode, ToncenterV3Traces } from '@/utils/retracer/traces'
import { ParsedTransaction } from '@/utils/ManagedBlockchain'
import { CallForSuccess } from '@/utils/callForSuccess'
import { parseWithPayloads } from '@truecarry/tlb-abi'
import { RecursivelyParseCellWithBlock } from '@/utils/tlb/cellParser'
import { Address } from '@ton/ton'

interface UseTraceDataResult {
  transactions: ParsedTransaction[]
  loading: boolean
  progress: {
    loaded: number
    total: number
  }
  error: string | null
  abort: () => void
}

export function useTraceData(txHash: string | null): UseTraceDataResult {
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const liteClient = useLiteclient()
  const selectedNetwork = useLiteclientState()

  // Use refs to track the current execution and enable abortion
  const abortControllerRef = useRef<AbortController | null>(null)
  const executionIdRef = useRef<number>(0)

  // Function to abort the current operation
  const abort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    if (loading) {
      executionIdRef.current++
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchTraceData = async () => {
      if (!txHash || !liteClient) return

      const isTestnet = selectedNetwork.selectedNetwork.get().is_testnet
      // Create a new AbortController for this execution
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Increment execution ID to invalidate any previous executions
      const currentExecutionId = ++executionIdRef.current

      try {
        setLoading(true)
        setError(null)
        setTransactions([])
        setProgress({ loaded: 0, total: 0 })

        // Fetch trace info from toncenter with abort signal
        const apiUrl = `https://${isTestnet ? 'testnet.' : ''}toncenter.com/api/v3/traces?tx_hash=${txHash}`
        const response = await CallForSuccess(async () => {
          const res = await fetch(apiUrl, {
            signal: abortController.signal,
          })
          if (res.status !== 200) {
            throw new Error('Failed to fetch trace data')
          }

          return res
        })

        // Check if the request was aborted or if execution ID changed
        if (abortController.signal.aborted || currentExecutionId !== executionIdRef.current) {
          return
        }

        const traceInfo = (await response.json()) as ToncenterV3Traces

        if (!traceInfo.traces || traceInfo.traces.length === 0) {
          throw new Error('No trace data found for this transaction')
        }

        const trace = traceInfo.traces[0]

        const transactionsList = Object.values(trace.transactions)
        setProgress({ loaded: 0, total: transactionsList.length })

        // Process transactions using queue instead of linear iteration
        const loadedTransactions: ParsedTransaction[] = []
        const txMap = new Map<string, ParsedTransaction>()
        const queue: { tx: any; parentHash?: string }[] = []

        // Find root transaction(s) to start with
        const rootTxs = transactionsList.filter((tx) => {
          const traceNode = findTraceNode(trace.trace, tx.hash)
          return traceNode && !traceNode.parent
        })

        // Enqueue root transactions first
        rootTxs.forEach((tx) => queue.push({ tx }))

        let processedCount = 0

        while (queue.length > 0) {
          // Check if operation was aborted
          if (abortController.signal.aborted || currentExecutionId !== executionIdRef.current) {
            return
          }

          const { tx, parentHash } = queue.shift()!
          const currentTxHash = tx.hash

          try {
            const traceNode = findTraceNode(trace.trace, currentTxHash)
            if (!traceNode) {
              throw new Error('Trace node not found')
            }

            const res = await getEmulationWithStack(
              liteClient as any,
              {
                addr: Address.parse(tx.account),
                hash: Buffer.from(tx.hash, 'base64'),
                lt: BigInt(tx.lt),
              },
              isTestnet,
              () => {
                // Check if this execution is still valid during the emulation
                if (
                  abortController.signal.aborted ||
                  currentExecutionId !== executionIdRef.current
                ) {
                  throw new Error('Operation was aborted')
                }
              }
            )

            // Check again after emulation completes
            if (abortController.signal.aborted || currentExecutionId !== executionIdRef.current) {
              return
            }

            // Cast the emulated transaction to match the Transaction type
            const emulatedTx = res.tx

            if (emulatedTx?.inMessage?.body) {
              let parsed: any
              try {
                parsed = parseWithPayloads(emulatedTx.inMessage.body.asSlice())
                if (parsed) {
                  emulatedTx.parsed = parsed
                }
              } catch (err) {
                console.log('error parsing tx', err)
              }
              try {
                const dataParsed = RecursivelyParseCellWithBlock(emulatedTx.inMessage.body)
                if (dataParsed) {
                  emulatedTx.parsedRaw = dataParsed
                }
              } catch (err) {
                //
              }
              //   if (
              //     parsed?.internal === 'jetton_burn' ||
              //     parsed?.internal === 'jetton_mint' ||
              //     parsed?.internal === 'jetton_transfer' ||
              //     parsed?.internal === 'jetton_internal_transfer'
              //   ) {
              //     try {
              //       const jettonInfo = await blockchain.runGetMethod(
              //         new Address(0, bigIntToBuffer(tx.address)),
              //         'get_wallet_data'
              //       )
              //       const balance = jettonInfo.stackReader.readBigNumber()
              //       const owner = jettonInfo.stackReader.readAddressOpt()
              //       const jettonAddress = jettonInfo.stackReader.readAddressOpt()
              //       const jettonData = {
              //         balance,
              //         owner,
              //         jettonAddress,
              //       }
              //       ;(tx as any).jettonData = jettonData
              //     } catch (err) {
              //       console.log('error getting jetton info', err)
              //     }
              //   }
            }

            loadedTransactions.push(emulatedTx)
            txMap.set(currentTxHash, emulatedTx)

            // Connect to parent if exists
            if (parentHash) {
              const parentTx = txMap.get(parentHash)
              if (parentTx) {
                parentTx.children.push(emulatedTx)
                emulatedTx.parent = parentTx
              }
            }

            // Enqueue all child transactions
            const childNodes = traceNode.node.children || []
            for (const childNode of childNodes) {
              const childTx = trace.transactions[childNode.tx_hash]
              if (childTx) {
                queue.push({ tx: childTx, parentHash: currentTxHash })
              }
            }

            processedCount++
            setProgress({ loaded: processedCount, total: transactionsList.length })
            setTransactions([...loadedTransactions])
          } catch (emulationError) {
            // Skip to next transaction if current one fails, unless aborted
            if (abortController.signal.aborted || currentExecutionId !== executionIdRef.current) {
              return
            }
            console.error(`Error emulating transaction ${currentTxHash}:`, emulationError)
          }
        }
      } catch (e) {
        // Don't update state if aborted
        if (abortController.signal.aborted || currentExecutionId !== executionIdRef.current) {
          return
        }
        console.error('Error fetching trace data:', e)
        setError(e instanceof Error ? e.message : 'Failed to load trace data')
      } finally {
        // Only update loading state if this is still the current execution
        if (currentExecutionId === executionIdRef.current) {
          setLoading(false)
        }

        // Clear the abort controller reference if it's still the current one
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null
        }
      }
    }

    fetchTraceData()

    // Cleanup function
    return () => {
      setLoading(false)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      executionIdRef.current++
    }
  }, [txHash, liteClient, selectedNetwork.selectedNetwork])

  return { transactions, loading, progress, error, abort }
}

function findTraceNode(
  trace: ToncenterV3TraceNode,
  txHash: string
): {
  node: ToncenterV3TraceNode
  parent: ToncenterV3TraceNode | null
} | null {
  if (trace.tx_hash === txHash) {
    return { node: trace, parent: null }
  }

  for (const child of trace.children) {
    const result = findTraceNode(child, txHash)
    if (result) {
      if (result.parent === null) {
        return { node: result.node, parent: trace }
      }
      return result
    }
  }

  return null
}
