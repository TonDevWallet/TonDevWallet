import { hookstate, useHookstate } from '@hookstate/core'
import { Transaction } from '@ton/core'

interface TransactionInfo {
  tx?: Transaction
  vmLogs: string
  debugLogs: string
  blockchainLogs: string
}

const transactionState = hookstate<TransactionInfo>({
  tx: undefined,
  vmLogs: '',
  debugLogs: '',
  blockchainLogs: '',
})

export function useTransactionState() {
  return useHookstate(transactionState)
}

export function getTransactionState() {
  return transactionState
}

export function setTransactionState(v: TransactionInfo) {
  transactionState.set(v)
}
