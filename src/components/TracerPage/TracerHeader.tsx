import { Button } from '@/components/ui/button'
import { useTracerItems, clearTracerState } from '@/store/tracerState'
import { clearRemoteTracerState } from '@/store/remoteTracerState'
import { useRef } from 'react'
import { processTracerJsonFile } from '@/utils/fileUpload'

export function TracerHeader() {
  const tracerItems = useTracerItems()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasItems = tracerItems.get()?.length > 0

  const handleClearGraph = () => {
    clearTracerState()
    clearRemoteTracerState()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await processTracerJsonFile(file)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-2xl font-bold">Transaction Tracer</h1>
      {hasItems && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleUploadClick}>
            Upload Graph
          </Button>
          <Button variant="outline" onClick={handleClearGraph}>
            Clear All
          </Button>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
            id="header-file-input"
          />
        </div>
      )}
    </div>
  )
}
