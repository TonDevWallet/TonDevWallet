import { useMemo, useState, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/utils/cn'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import Editor from '@monaco-editor/react'

export function BlockchainLogsInfo({ logs }: { logs: string }) {
  const [copied, setCopied] = useState(false)
  const activeFormat = 'json'
  const editorRef = useRef(null)

  const formattedData = useMemo(() => {
    if (!logs || logs.trim() === '') return ''

    return logs
  }, [logs, activeFormat])

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
          <CardTitle>Blockchain Logs</CardTitle>
          <div className="flex items-center gap-4">
            <button
              onClick={copyToClipboard}
              disabled={!logs || logs.trim() === ''}
              className={cn(
                'min-w-[120px] h-8 px-3 rounded-md transition-colors',
                logs && logs.trim() !== ''
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
          {logs && logs.trim() !== '' ? (
            <div className="relative">
              <Editor
                height="calc(100vh - 200px)"
                language={activeFormat === 'json' ? 'json' : 'plaintext'}
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
              <p className="text-lg">No blockchain logs available</p>
              <p className="text-sm text-center max-w-md">
                There are no blockchain logs available for this transaction.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
