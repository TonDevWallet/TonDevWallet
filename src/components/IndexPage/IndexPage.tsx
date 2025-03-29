import { MessagesHistoryList } from './MessagesHistoryList'
import { MessagesList } from './MessagesList'
import { SessionsList } from './SessionsList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function IndexPage() {
  return (
    // <div className="grid grid-cols-2 md:grid-cols-[300px_1fr] gap-2 mt-2 mr-2">
    <div>
      <Tabs defaultValue="messages" className="flex flex-col">
        <TabsList className="mb-4 mx-auto">
          <TabsTrigger value="messages" className="cursor-pointer">
            Messages
          </TabsTrigger>
          <TabsTrigger value="history" className="cursor-pointer">
            History
          </TabsTrigger>
          <TabsTrigger value="sessions" className="cursor-pointer">
            Sessions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="messages">
          <MessagesList />
        </TabsContent>
        <TabsContent value="history">
          <MessagesHistoryList />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsList />
        </TabsContent>
      </Tabs>
    </div>
    // </div>
  )
}
