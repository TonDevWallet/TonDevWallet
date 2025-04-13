import { Button } from '@/components/ui/button'
import { useTracerItems, clearTracerState, addRemoteTracerItem } from '@/store/tracerState'
import { clearRemoteTracerState } from '@/store/remoteTracerState'
import { useRef, useState } from 'react'
import { processTracerJsonFile } from '@/utils/fileUpload'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export function TracerHeader() {
  const tracerItems = useTracerItems()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasItems = tracerItems.get()?.length > 0
  const [dialogOpen, setDialogOpen] = useState(false)
  const [txHash, setTxHash] = useState('')

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

  const handleRemoteViewSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const hash = txHash.trim()
    if (!hash) return

    // Create a new tab and start remote trace emulation
    const traceName = `Trace ${hash.substring(0, 10)}...`
    addRemoteTracerItem(traceName, hash)

    // Close dialog and clear input
    setDialogOpen(false)
    setTxHash('')
  }

  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-2xl font-bold">Transaction Tracer</h1>
      {hasItems && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            Add Remote View
          </Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Remote Tracer by Hash</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRemoteViewSubmit}>
            <div className="flex flex-col gap-4 py-4">
              <Input
                placeholder="Enter transaction hash"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="col-span-3"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
