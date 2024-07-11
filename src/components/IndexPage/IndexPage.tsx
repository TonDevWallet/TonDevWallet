import { MessagesHistoryList } from './MessagesHistoryList'
import { MessagesList } from './MessagesList'
import { SessionsList } from './SessionsList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function IndexPage() {
  return (
    <div className="container mx-auto p-4">
      <Tabs defaultValue="messages" className="flex flex-col">
        <TabsList className="mb-4 mx-auto">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
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
  )
}
