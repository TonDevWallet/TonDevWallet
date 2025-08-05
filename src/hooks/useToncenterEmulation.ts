import { useEffect, useState, useMemo } from 'react'
import {
  createToncenterMessage,
  fetchToncenterEmulation,
  processToncenterMoneyFlow,
  validateToncenterMoneyFlow,
  type ToncenterEmulationResult,
  type MoneyFlow,
} from '@/utils/toncenterEmulation'
import { ImmutableArray, State } from '@hookstate/core'
import { ConnectMessageTransactionMessage } from '@/types/connect'

export interface UseToncenterEmulationOptions {
  walletAddress: string | undefined
  messages: State<ImmutableArray<ConnectMessageTransactionMessage>>
  localMoneyFlow: MoneyFlow
}

export interface UseToncenterEmulationResult {
  emulation: ToncenterEmulationResult
  moneyFlow: MoneyFlow
  isCorrect: boolean
  error: string | null
  isLoading: boolean
}

export function useToncenterEmulation({
  walletAddress,
  messages,
  localMoneyFlow,
}: UseToncenterEmulationOptions): UseToncenterEmulationResult {
  const [emulation, setEmulation] = useState<ToncenterEmulationResult>({
    result: null,
  })
  const [isLoading, setIsLoading] = useState(false)

  const toncenterMessage = useMemo(() => {
    return createToncenterMessage(walletAddress, messages)
  }, [walletAddress, messages])

  useEffect(() => {
    let cancelled = false

    async function getToncenterEmulation() {
      if (!walletAddress || !messages.length) {
        return
      }

      setIsLoading(true)
      try {
        const result = await fetchToncenterEmulation(toncenterMessage)
        if (!cancelled) {
          setEmulation(result)
        }
      } catch (error) {
        console.error('Failed to fetch toncenter emulation:', error)
        if (!cancelled) {
          setEmulation({ result: null })
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    getToncenterEmulation()

    return () => {
      cancelled = true
    }
  }, [toncenterMessage, walletAddress, messages])

  const toncenterMoneyFlow = useMemo(() => {
    return processToncenterMoneyFlow(emulation)
  }, [emulation])

  const validation = useMemo(() => {
    if (!localMoneyFlow.ourAddress) {
      return { isValid: true, error: null }
    }
    return validateToncenterMoneyFlow(toncenterMoneyFlow, localMoneyFlow)
  }, [toncenterMoneyFlow, localMoneyFlow])

  return {
    emulation,
    moneyFlow: toncenterMoneyFlow,
    isCorrect: validation.isValid,
    error: validation.error,
    isLoading,
  }
}
