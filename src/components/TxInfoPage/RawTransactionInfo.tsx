import { useMemo, useState, useRef } from 'react'
import { RecursivelyParseCellWithBlock, sanitizeObject } from '@/utils/tlb/cellParser'
import { beginCell, storeTransaction, Transaction } from '@ton/core'
import { stringify } from 'yaml'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/utils/cn'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import Editor from '@monaco-editor/react'

export function RawTransactionInfo({ tx }: { tx: Transaction }) {
  const [copied, setCopied] = useState(false)
  const [activeFormat, setActiveFormat] = useState<'yaml' | 'json'>('yaml')
  const editorRef = useRef(null)

  const rawTransactionInfo = useMemo(() => {
    try {
      const txCell = beginCell().store(storeTransaction(tx)).endCell()
      const dataParsed = RecursivelyParseCellWithBlock(txCell)
      return dataParsed
    } catch (error) {
      console.error('Failed to parse transaction:', error)
      return null
    }
  }, [tx])

  const formattedData = useMemo(() => {
    if (!rawTransactionInfo) return ''

    const sanitized = sanitizeObject(rawTransactionInfo)
    return activeFormat === 'yaml'
      ? stringify(sanitized, null, 2)
      : JSON.stringify(sanitized, null, 2)
  }, [rawTransactionInfo, activeFormat])

  const copyToClipboard = () => {
    if (formattedData) {
      navigator.clipboard.writeText(formattedData)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor
  }

  return (
    <div className="flex flex-1 p-4 overflow-auto">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Raw Transaction Data</CardTitle>
          <div className="flex items-center gap-4">
            <Tabs value={activeFormat} onValueChange={(v) => setActiveFormat(v as 'yaml' | 'json')}>
              <TabsList className="grid w-[160px] grid-cols-2">
                <TabsTrigger value="yaml">YAML</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
            </Tabs>
            <button
              onClick={copyToClipboard}
              disabled={!rawTransactionInfo}
              className={cn(
                'min-w-[120px] h-8 px-3 rounded-md transition-colors',
                rawTransactionInfo
                  ? 'bg-secondary hover:bg-secondary/80 text-foreground'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
              title="Copy to clipboard"
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="mr-2" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {rawTransactionInfo ? (
            <div className="relative">
              <Editor
                height="calc(100vh - 200px)"
                language={activeFormat === 'json' ? 'json' : 'yaml'}
                value={formattedData}
                onMount={handleEditorDidMount}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  folding: true,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  wrappingIndent: 'deepIndent',
                  automaticLayout: true,
                  stickyScroll: {
                    enabled: true,
                    defaultModel: 'outlineModel',
                    maxLineCount: 5,
                  },
                  renderWhitespace: 'none',
                  contextmenu: false,
                  autoDetectHighContrast: false,
                }}
                className="mt-2 rounded-lg border border-border max-h-[calc(100vh-200px)]"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 space-y-3 text-muted-foreground bg-muted/50 rounded-lg border border-border">
              <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
              <p className="text-lg">Cannot parse raw transaction</p>
              <p className="text-sm text-center max-w-md">
                The transaction data could not be parsed into a readable format. This might be due
                to an unsupported transaction format or corrupted data.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
