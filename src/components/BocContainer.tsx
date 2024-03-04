import { Cell } from '@ton/core'
import { getBase64Cell } from '@/hooks/useCell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from './ui/textarea'
import clipboard from 'clipboardy'
import { Button } from './ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons'
import { useMemo, useState } from 'react'
import { Block } from './ui/Block'

export function BocContainer({ boc, label }: { boc: string | Cell; label: string }) {
  const [tab, setTab] = useState('string')
  const [copied, setCopied] = useState(false)
  const dataCell = useMemo(() => (typeof boc === 'string' ? getBase64Cell(boc) : boc), [boc])

  if (!dataCell) {
    return <div>Invalid BOC</div>
  }

  const pressCopy = () => {
    if (tab === 'string') {
      clipboard.write(dataCell.toString())
    } else if (tab === 'hex') {
      clipboard.write(dataCell.toBoc().toString('hex'))
    } else if (tab === 'base64') {
      clipboard.write(dataCell.toBoc().toString('base64'))
    }

    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 1000)
  }

  return (
    <Block className="w-full">
      <Tabs defaultValue="string" className="flex flex-col" onValueChange={(e) => setTab(e)}>
        <div className="flex justify-between items-center">
          <p className="">{label}</p>
          <div className="flex gap-2">
            <TabsList className="p-0 h-auto bg-transparent">
              <TabsTrigger className="data-[state=active]:bg-muted" value="string">
                String
              </TabsTrigger>
              <TabsTrigger className="data-[state=active]:bg-muted" value="hex">
                Hex
              </TabsTrigger>
              <TabsTrigger className="data-[state=active]:bg-muted" value="base64">
                Base64
              </TabsTrigger>
            </TabsList>

            <Button variant={'ghost'} onClick={pressCopy} className="">
              {copied ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={faCopy} />}
            </Button>
          </div>
        </div>

        <TabsContent value="string">
          <Textarea className="w-full">{dataCell.toString()}</Textarea>
        </TabsContent>
        <TabsContent value="hex">
          <Textarea className="w-full">{dataCell.toBoc().toString('hex')}</Textarea>
        </TabsContent>
        <TabsContent value="base64">
          <Textarea className="w-full">{dataCell.toBoc().toString('base64')}</Textarea>
        </TabsContent>
      </Tabs>
    </Block>
  )
}
