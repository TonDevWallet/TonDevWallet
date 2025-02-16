import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { faExpand } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { cn } from '@/utils/cn'
import { Block } from '@/components/ui/Block'
import { MessageFlow } from '../IndexPage/MessageFlow'

interface GraphDisplayProps {
  transactions: any[]
}

export function GraphDisplay({ transactions }: GraphDisplayProps) {
  const [max, setMax] = useState(false)

  return (
    <>
      <div className="flex gap-2">
        <Button variant={'outline'} className={'mb-4'} onClick={() => setMax((v) => !v)}>
          <FontAwesomeIcon icon={faExpand} className={'mr-2'} />
          Toggle Preview Size
        </Button>
      </div>

      <Block className={cn('h-[50vh]', max && 'h-[90vh]', 'p-0')}>
        <MessageFlow transactions={transactions} />
      </Block>
    </>
  )
}
