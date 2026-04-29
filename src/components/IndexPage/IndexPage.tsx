import { useState } from 'react'
import { MessagesHistoryList } from './MessagesHistoryList'
import { MessagesList } from './MessagesList'
import { SessionsList } from './SessionsList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RejectMessages } from './RejectMessages'

export type IndexPageTab = 'messages' | 'history' | 'sessions'

export function IndexPage({ defaultTab = 'messages' }: { defaultTab?: IndexPageTab }) {
  const [activeTab, setActiveTab] = useState<IndexPageTab>(defaultTab)

  return (
    // <div className="grid grid-cols-2 md:grid-cols-[300px_1fr] gap-2 mt-2 mr-2">
    <div>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as IndexPageTab)}
        className="flex flex-col"
      >
        <div className="w-full flex justify-center relative">
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
          {activeTab === 'messages' && (
            <div className="absolute right-0">
              <RejectMessages />
            </div>
          )}
        </div>
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
