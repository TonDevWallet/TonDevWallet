import { FromMnemonic } from './FromMnemonic'
import { FromRandom } from './FromRandom'
import { FromSeed } from './FromSeed'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function NewWalletPage() {
  return (
    <div className="mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <Tabs defaultValue="random" className="">
        <TabsList className="mb-4">
          <TabsTrigger value="random">Create random wallet</TabsTrigger>
          <TabsTrigger value="mnemonic">From Mnemonic</TabsTrigger>
          <TabsTrigger value="seed">From Seed</TabsTrigger>
        </TabsList>
        <TabsContent
          value="random" /* forceMount={true} className="hidden data-[state=active]:block" */
        >
          <FromRandom />
        </TabsContent>
        <TabsContent value="mnemonic">
          <FromMnemonic />
        </TabsContent>
        <TabsContent value="seed">
          <FromSeed />
        </TabsContent>
      </Tabs>
    </div>
  )
}
