import { hookstate, useHookstate } from '@hookstate/core'

export interface TraceProgress {
  loaded: number
  total: number
}

export interface RemoteTracerState {
  txHash: string
  activeHash: string | null
  transactions: any[]
  traceLoading: boolean
  traceProgress: TraceProgress
  traceError: string | null
}

const state = hookstate<RemoteTracerState>({
  txHash: '',
  activeHash: null,
  transactions: [],
  traceLoading: false,
  traceProgress: { loaded: 0, total: 0 },
  traceError: null,
})

export function useRemoteTracerState() {
  return useHookstate(state)
}

export function useTxHash() {
  const remoteTracerState = useHookstate(state)
  return remoteTracerState.txHash
}

export function useActiveHash() {
  const remoteTracerState = useHookstate(state)
  return remoteTracerState.activeHash
}

export function useTracerTransactions() {
  const remoteTracerState = useHookstate(state)
  return remoteTracerState.transactions
}

export function useTraceLoading() {
  const remoteTracerState = useHookstate(state)
  return remoteTracerState.traceLoading
}

export function useTraceProgress() {
  const remoteTracerState = useHookstate(state)
  return remoteTracerState.traceProgress
}

export function useTraceError() {
  const remoteTracerState = useHookstate(state)
  return remoteTracerState.traceError
}

export function setTxHash(hash: string) {
  state.txHash.set(hash)
}

export function setActiveHash(hash: string | null) {
  state.activeHash.set(hash)
}

export function setTracerTransactions(transactions: any[]) {
  state.transactions.set(transactions)
}

export function setTraceLoading(loading: boolean) {
  state.traceLoading.set(loading)
}

export function setTraceProgress(progress: TraceProgress) {
  state.traceProgress.set(progress)
}

export function setTraceError(error: string | null) {
  state.traceError.set(error)
}

export function clearRemoteTracerState() {
  state.txHash.set('')
  state.activeHash.set(null)
  state.transactions.set([])
  state.traceLoading.set(false)
  state.traceProgress.set({ loaded: 0, total: 0 })
  state.traceError.set(null)
}
