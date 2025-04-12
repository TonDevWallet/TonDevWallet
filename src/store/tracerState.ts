import { hookstate, useHookstate } from '@hookstate/core'
import { ParsedTransaction } from '@/utils/ManagedBlockchain'

export interface GraphData {
  transactions: ParsedTransaction[]
}

export interface TracerState {
  selectedTx: ParsedTransaction | null
  graphData: GraphData | null
}

const state = hookstate<TracerState>({
  selectedTx: null,
  graphData: null,
})

export function useTracerState() {
  return useHookstate(state)
}

export function useGraphData() {
  const tracerState = useHookstate(state)
  return tracerState.graphData
}

export function useSelectedTx() {
  const tracerState = useHookstate(state)
  return tracerState.selectedTx
}

export function setGraphData(data: GraphData | null) {
  console.log('setGraphData', data)
  state.graphData.set(data)
}

export function setSelectedTx(tx: ParsedTransaction | null) {
  state.selectedTx.set(tx)
}

export function clearTracerState() {
  state.selectedTx.set(null)
  state.graphData.set(null)
}
