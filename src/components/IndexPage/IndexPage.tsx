import { MessagesList } from './MessagesList'
import { SessionsList } from './SessionsList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function IndexPage() {
  return (
    // <div className="grid grid-cols-2 md:grid-cols-[300px_1fr] gap-2 mt-2 mr-2">
    <div>
      <Tabs defaultValue="messages" className="flex flex-col">
        <TabsList className="mb-4 mx-auto">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="messages">
          <MessagesList />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsList />
        </TabsContent>
      </Tabs>
    </div>
    // </div>
  )
}
