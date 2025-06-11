import { useDatabase } from '@/db'
import { useEffect, useState } from 'react'
import { ConnectMessageTransaction } from '@/types/connect'
import { TonConnectMessageRecord } from '@/store/connectMessages'

interface UseMessagesHistoryOptions {
  pageSize?: number
}

interface UseMessagesHistoryReturn {
  messages: TonConnectMessageRecord[]
  currentPage: number
  totalPages: number
  totalCount: number
  isLoading: boolean
  error: string | null
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
}

export function useMessagesHistory(
  options: UseMessagesHistoryOptions = {}
): UseMessagesHistoryReturn {
  const { pageSize = 10 } = options
  const db = useDatabase()

  const [messages, setMessages] = useState<TonConnectMessageRecord[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPages = Math.ceil(totalCount / pageSize)

  const fetchMessages = async (page: number) => {
    try {
      setIsLoading(true)
      setError(null)

      const offset = (page - 1) * pageSize

      // Get total count
      const countResult = await db<ConnectMessageTransaction>('connect_message_transactions')
        .where({ status: 1 })
        .count('* as count')
        .first()

      const count = (countResult as any)?.count || 0
      setTotalCount(count)

      // Get paginated messages
      const dbMessages = await db<ConnectMessageTransaction>('connect_message_transactions')
        .where({ status: 1 })
        .orderBy('id', 'desc')
        .limit(pageSize)
        .offset(offset)
        .select('*')

      const transformedMessages: TonConnectMessageRecord[] = dbMessages.map((m) => {
        return {
          id: m.id,
          connect_session_id: m.connect_session_id,
          connect_event_id: m.connect_event_id,
          status: m.status,
          key_id: m.key_id,
          wallet_id: m.wallet_id,
          message_cell: m.message_cell,
          wallet_address: m.wallet_address,
          payload: m.payload ? JSON.parse(m.payload) : undefined,
          message_type: m.message_type,
          sign_payload: m.sign_payload ? JSON.parse(m.sign_payload) : undefined,
        }
      })

      setMessages(transformedMessages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages(currentPage)
  }, [currentPage, pageSize])

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  return {
    messages,
    currentPage,
    totalPages,
    totalCount,
    isLoading,
    error,
    goToPage,
    nextPage,
    prevPage,
  }
}
