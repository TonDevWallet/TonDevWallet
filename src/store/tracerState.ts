import { hookstate, useHookstate } from '@hookstate/core'
import { ParsedTransaction } from '@/utils/ManagedBlockchain'

export interface TracerState {
  selectedTx: ParsedTransaction | null
}

const state = hookstate<TracerState>({
  selectedTx: null,
})

export function useTracerState() {
  return useHookstate(state)
}

export function useSelectedTx() {
  const tracerState = useHookstate(state)
  return tracerState.selectedTx
}

export function setSelectedTx(tx: ParsedTransaction | null) {
  state.selectedTx.set(tx)
}
