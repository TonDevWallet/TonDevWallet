import { cn } from '@/utils/cn'
import { Block } from '@/components/ui/Block'
import { MessageFlow } from '../IndexPage/MessageFlow'
import { ParsedTransaction } from '@/utils/ManagedBlockchain'

interface GraphDisplayProps {
  transactions: ParsedTransaction[] | undefined
}

export function GraphDisplay({ transactions }: GraphDisplayProps) {
  return (
    <div className="flex flex-col gap-4 mt-4">
      <Block className={cn('h-[50vh]', 'p-0')}>
        <MessageFlow transactions={transactions} />
      </Block>
    </div>
  )
}
