import { hookstate, none, useHookstate } from '@hookstate/core'
import { ParsedTransaction } from '@/utils/ManagedBlockchain'
import { uuidv7 } from '@/utils/uuidv7'
import { CallForSuccess } from '@/utils/callForSuccess'
import { Address } from '@ton/ton'
import { getEmulationWithStack } from '@/utils/retracer/retracer'
import { parseWithPayloads } from '@truecarry/tlb-abi'
import { RecursivelyParseCellWithBlock } from '@/utils/tlb/cellParser'
import { LiteClient } from 'ton-lite-client'
import { LiteClientState } from './liteClient'
import { getToncenter3Url } from '@/utils/ton'

export interface GraphData {
  transactions: ParsedTransaction[]
}

export interface TraceProgress {
  loaded: number
  total: number
}

export interface RemoteTraceData {
  hash: string
  loading: boolean
  progress: TraceProgress
  error: string | null
  abortController: AbortController | null
}

export interface TracerItem {
  id: string
  name: string
  selectedTx: ParsedTransaction | null
  graphData: GraphData | null
  // If remoteId exists, this is a remote trace item
  remoteId?: string
}

// Expand the state to include remote traces
const state = hookstate<{
  items: TracerItem[]
  activeItemId: string | null
  remoteTraces: Record<string, RemoteTraceData>
}>({
  items: [],
  activeItemId: null,
  remoteTraces: {},
})

export function useTracerState() {
  return useHookstate(state)
}

export function useTracerItems() {
  const tracerState = useHookstate(state)
  return tracerState.items
}

export function useActiveItemId() {
  const tracerState = useHookstate(state)
  return tracerState.activeItemId
}

export function useActiveItem({ noproxy }: { noproxy?: boolean } = {}) {
  const tracerState = useHookstate(state)
  const activeId = tracerState.activeItemId.get()

  if (!activeId) return null

  const items = tracerState.items.get({ noproxy })
  return items.find((item) => item.id === activeId)
}

export function useGraphData({ noproxy }: { noproxy?: boolean } = {}) {
  const activeItem = useActiveItem({ noproxy })
  return activeItem?.graphData || null
}

export function useSelectedTx() {
  const activeItem = useActiveItem()
  return activeItem?.selectedTx || null
}

// Add functions to access remote trace data
export function useRemoteTraceData(remoteId: string | undefined) {
  if (!remoteId) return null
  const tracerState = useHookstate(state)
  return tracerState.remoteTraces[remoteId]
}

export function useActiveRemoteTraceData() {
  const activeItem = useActiveItem()
  if (!activeItem?.remoteId) return null

  return useRemoteTraceData(activeItem.remoteId)
}

// Update addTracerItem to support remoteId
export function addTracerItem(name: string, data: GraphData | null, remoteId?: string) {
  const id = uuidv7()
  const newItem: TracerItem = {
    id,
    name,
    selectedTx: null,
    graphData: data,
    remoteId,
  }

  state.items.merge([newItem])
  state.activeItemId.set(id)

  return id
}

// Add function to create a remote tracer item
export function addRemoteTracerItem(name: string, hash: string) {
  // Create a unique remote ID
  const remoteId = uuidv7()

  // Add basic trace data
  state.remoteTraces[remoteId].set({
    hash,
    loading: true,
    progress: { loaded: 0, total: 0 },
    error: null,
    abortController: new AbortController(),
  })

  // Create the tab with empty graph data
  const tabId = addTracerItem(name, { transactions: [] }, remoteId)

  // Start the trace emulation
  startRemoteTraceEmulation(remoteId, hash)

  return tabId
}

export function setActiveItem(id: string) {
  state.activeItemId.set(id)
}

export function setGraphData(data: GraphData | null) {
  const activeId = state.activeItemId.get()
  if (!activeId) return

  const index = state.items.get().findIndex((item) => item.id === activeId)
  if (index === -1) return

  state.items[index].graphData.set(data)
}

export function setSelectedTx(tx: ParsedTransaction | null) {
  const activeId = state.activeItemId.get()
  if (!activeId) return

  const index = state.items.get().findIndex((item) => item.id === activeId)
  if (index === -1) return

  state.items[index].selectedTx.set(tx)
}

// Update removeTracerItem to handle remote traces
export function removeTracerItem(id: string) {
  const items = state.items.get()
  const item = items.find((item) => item.id === id)

  // If it's a remote trace, abort and remove it
  if (item?.remoteId) {
    abortRemoteTrace(item.remoteId)
    state.remoteTraces[item.remoteId].set(none)
  }

  const currentIndex = items.findIndex((item) => item.id === id)

  const filteredItemsIndices = items.map((item, index) => (item.id === id ? index : undefined))
  // .filter((i) => typeof i === 'number')
  const filteredItemsIndicesNumbers = filteredItemsIndices.filter((i) => typeof i === 'number')

  console.log('filteredItemsIndices', id, items, filteredItemsIndices, filteredItemsIndicesNumbers)
  for (const i of filteredItemsIndicesNumbers) {
    state.items[i].set(none)
  }

  if (state.activeItemId.get() === id) {
    if (state.items.length > 0) {
      state.activeItemId.set(state.items[currentIndex - 1].id.get())
    } else {
      state.activeItemId.set(null)
    }
  }
}

export function renameTracerItem(id: string, newName: string) {
  const index = state.items.get().findIndex((item) => item.id === id)
  if (index === -1) return

  state.items[index].name.set(newName)
}

// Update clearTracerState to handle remote traces
export function clearTracerState() {
  // Abort all remote traces first
  const remoteTraces = state.remoteTraces.get()
  Object.values(remoteTraces).forEach((trace) => {
    if (trace.abortController) {
      trace.abortController.abort()
    }
  })

  state.items.set([])
  state.activeItemId.set(null)
  state.remoteTraces.set({})
}

// Remote trace functionality

// Abort a specific remote trace
export function abortRemoteTrace(remoteId: string) {
  const trace = state.remoteTraces[remoteId].get()
  if (trace?.abortController) {
    trace.abortController.abort()
    state.remoteTraces[remoteId].merge({
      loading: false,
      abortController: null,
    })
  }
}

// Update remote trace status and related graph data
export function updateRemoteTraceStatus(
  remoteId: string,
  loading: boolean,
  progress: TraceProgress,
  error: string | null,
  transactions: ParsedTransaction[] = []
) {
  // Update remote trace data
  state.remoteTraces[remoteId].merge({
    loading,
    progress,
    error,
    abortController: loading ? state.remoteTraces[remoteId].abortController.get() : null,
  })

  // Update graph data if transactions are provided
  if (transactions.length > 0) {
    // Find all items with this remoteId
    const items = state.items.get()
    const indices = items
      .map((item, index) => (item.remoteId === remoteId ? index : -1))
      .filter((index) => index !== -1)

    // Update graph data for all matching items
    for (const index of indices) {
      state.items[index].graphData.set({ transactions })
    }
  }
}

// Start remote trace emulation process
async function startRemoteTraceEmulation(remoteId: string, hash: string) {
  try {
    console.log('startRemoteTraceEmulation', remoteId, hash)
    // Create a local reference to liteClient for this function execution
    // We'll need to get it from the context in a real implementation
    const liteClient = LiteClientState.liteClient.get({ noproxy: true }) as LiteClient
    const isTestnet = LiteClientState.selectedNetwork.get()?.is_testnet
    const toncenter3Url = LiteClientState.selectedNetwork.get()?.toncenter3_url

    // In a real-world implementation, you would get the liteClient like this:
    // const liteClientModule = await import('@/store/liteClient');
    // const liteClient = liteClientModule.getLiteClient();
    // const selectedNetwork = liteClientModule.getSelectedNetwork();
    // const isTestnet = selectedNetwork.is_testnet;

    // Get a new abort controller for this trace
    const abortController = new AbortController()
    state.remoteTraces[remoteId].abortController.set(abortController)

    // Set initial status
    updateRemoteTraceStatus(remoteId, true, { loaded: 0, total: 0 }, null)

    // Fetch the trace data
    const apiUrl = `${getToncenter3Url(isTestnet, toncenter3Url)}traces?tx_hash=${hash}`
    const response = await CallForSuccess(async () => {
      const res = await fetch(apiUrl, {
        signal: abortController.signal,
      })
      if (res.status !== 200) {
        throw new Error('Failed to fetch trace data')
      }
      return res
    })

    console.log('toncenter response', response)
    // debugger

    // Check if aborted
    if (abortController.signal.aborted) return

    const traceInfo = await response.json()

    if (!traceInfo.traces || traceInfo.traces.length === 0) {
      updateRemoteTraceStatus(
        remoteId,
        false,
        { loaded: 0, total: 0 },
        'No trace data found for this transaction'
      )
      return
    }

    const trace = traceInfo.traces[0]
    const transactionsList = Object.values(trace.transactions)

    // Update progress with total
    updateRemoteTraceStatus(remoteId, true, { loaded: 0, total: transactionsList.length }, null)

    // Process transactions
    const loadedTransactions: ParsedTransaction[] = []
    const txMap = new Map<string, ParsedTransaction>()
    const queue: { tx: any; parentHash?: string }[] = []

    // Find root transactions
    const rootTxs = transactionsList.filter((tx: any) => {
      const traceNode = findTraceNode(trace.trace, tx.hash)
      return traceNode && !traceNode.parent
    })

    // Enqueue root transactions
    rootTxs.forEach((tx: any) => queue.push({ tx }))

    let processedCount = 0

    // Since we need liteClient, we'll just simulate progress here
    // In a real implementation, you would process each transaction
    if (!liteClient) {
      updateRemoteTraceStatus(
        remoteId,
        false,
        { loaded: 0, total: transactionsList.length },
        'No liteClient available for emulation',
        []
      )
      return
    }

    while (queue.length > 0) {
      // Check if aborted
      if (abortController.signal.aborted) return

      const { tx, parentHash } = queue.shift()!
      const currentTxHash = tx.hash

      try {
        const traceNode = findTraceNode(trace.trace, currentTxHash)
        if (!traceNode) {
          throw new Error('Trace node not found')
        }

        const res = await getEmulationWithStack(
          liteClient,
          {
            addr: Address.parse(tx.account),
            hash: Buffer.from(tx.hash, 'base64'),
            lt: BigInt(tx.lt),
          },
          isTestnet,
          toncenter3Url,
          () => {
            // Check if aborted during emulation
            if (abortController.signal.aborted) {
              throw new Error('Operation was aborted')
            }
          }
        )

        // Check if aborted after emulation
        if (abortController.signal.aborted) return

        // Process emulated transaction
        const emulatedTx = res.tx

        if (emulatedTx?.inMessage?.body) {
          try {
            const parsed = parseWithPayloads(emulatedTx.inMessage.body.asSlice())
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
            // Ignore parsing errors
          }
        }

        loadedTransactions.push(emulatedTx)
        txMap.set(currentTxHash, emulatedTx)

        // Connect to parent
        if (parentHash) {
          const parentTx = txMap.get(parentHash)
          if (parentTx) {
            if (!parentTx.children) parentTx.children = []
            parentTx.children.push(emulatedTx)
            emulatedTx.parent = parentTx
          }
        }

        // Enqueue child transactions
        const childNodes = traceNode.node.children || []
        for (const childNode of childNodes) {
          const childTx = trace.transactions[childNode.tx_hash]
          if (childTx) {
            queue.push({ tx: childTx, parentHash: currentTxHash })
          }
        }

        processedCount++
        updateRemoteTraceStatus(
          remoteId,
          true,
          { loaded: processedCount, total: transactionsList.length },
          null,
          [...loadedTransactions]
        )
      } catch (emulationError) {
        if (abortController.signal.aborted) return

        console.error(`Error emulating transaction ${currentTxHash}:`, emulationError)
      }
    }

    // Mark trace as completed
    updateRemoteTraceStatus(
      remoteId,
      false,
      { loaded: processedCount, total: transactionsList.length },
      null,
      loadedTransactions
    )
  } catch (error) {
    if (state.remoteTraces[remoteId].abortController.get()?.signal.aborted) return

    const errorMessage = error instanceof Error ? error.message : 'Failed to load trace data'
    console.error('Error in remote trace emulation:', error)

    // Update with error
    updateRemoteTraceStatus(remoteId, false, { loaded: 0, total: 0 }, errorMessage)
  }
}

// Helper function to find trace nodes
function findTraceNode(
  trace: any,
  txHash: string
): {
  node: any
  parent: any | null
} | null {
  if (trace.tx_hash === txHash) {
    return { node: trace, parent: null }
  }

  for (const child of trace.children || []) {
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
