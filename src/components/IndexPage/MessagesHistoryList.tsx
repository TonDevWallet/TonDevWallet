import { MessageHistoryRow } from './MessageHistoryRow'
import { Pagination } from './Pagination'
import { useMessagesHistory } from '@/hooks/useMessagesHistory'
import { Block } from '@/components/ui/Block'

export function MessagesHistoryList() {
  const { messages, currentPage, totalPages, isLoading, error, goToPage, nextPage, prevPage } =
    useMessagesHistory({ pageSize: 10 })

  if (error) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <Block className="text-center">
          <div className="text-red-600">
            <p className="font-medium">Error loading messages</p>
            <p className="text-sm mt-1 text-red-500">{error}</p>
          </div>
        </Block>
      </div>
    )
  }

  if (isLoading && messages.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <Block className="text-center">
          <div className="text-muted-foreground">Loading messages...</div>
        </Block>
      </div>
    )
  }

  if (!isLoading && messages.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <Block className="text-center">
          <div className="text-muted-foreground">No messages found</div>
        </Block>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto mb-8">
      {/* Top pagination */}
      <Pagination
        rootClassName="mb-4"
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        onPrevious={prevPage}
        onNext={nextPage}
      />

      {/* Messages list */}
      <div className="flex flex-col gap-4 overflow-x-hidden">
        {messages.map((s, i) => {
          return (
            <MessageHistoryRow
              connectMessage={s}
              key={s.id}
              shouldFetch={i === 0 && currentPage === 1}
            />
          )
        })}
      </div>

      {/* Bottom pagination */}
      <Pagination
        rootClassName="mt-4"
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        onPrevious={prevPage}
        onNext={nextPage}
      />
    </div>
  )
}
