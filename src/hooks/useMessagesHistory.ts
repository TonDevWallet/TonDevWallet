import { useDatabase } from '@/db'
import { useEffect, useState } from 'react'
import { ConnectMessageTransaction } from '@/types/connect'
import { parseDbMessage, type TonConnectMessageRecord } from '@/store/connectMessages'

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
      const countResult = await db.first<{ count: number }>(
        'SELECT COUNT(*) AS count FROM connect_message_transactions WHERE status = ?',
        [1]
      )

      const count = Number(countResult?.count ?? 0)
      setTotalCount(count)

      // Get paginated messages
      const dbMessages = await db.select<ConnectMessageTransaction>(
        `
          SELECT *
          FROM connect_message_transactions
          WHERE status = ?
          ORDER BY id DESC
          LIMIT ? OFFSET ?
        `,
        [1, pageSize, offset]
      )

      setMessages(dbMessages.map(parseDbMessage))
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
