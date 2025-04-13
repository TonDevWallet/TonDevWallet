import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  addRemoteTracerItem,
  useActiveRemoteTraceData,
  abortRemoteTrace,
  useActiveItem,
} from '@/store/tracerState'
import { useTxHash, setTxHash, clearRemoteTracerState } from '@/store/remoteTracerState'

export function RemoteTracerViewer() {
  const txHash = useTxHash()

  // Get the active remote trace data
  const activeTraceData = useActiveRemoteTraceData()
  const activeItem = useActiveItem()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const hash = txHash.get().trim()
    if (!hash) return

    // Create a new tab immediately and start remote trace emulation
    const traceName = `Trace ${hash.substring(0, 10)}...`
    addRemoteTracerItem(traceName, hash)

    // Clear the input field
    setTxHash('')
  }

  const handleClear = () => {
    clearRemoteTracerState()
    setTxHash('')
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <Input
          type="text"
          value={txHash.get()}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="Enter transaction hash"
          className="flex-1"
        />
        <Button type="submit" disabled={!txHash.get().trim()}>
          Trace
        </Button>
        <Button variant="outline" onClick={handleClear} type="button">
          Clear
        </Button>
      </form>

      {activeTraceData && (
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Active Trace: {activeTraceData.hash.get()}</h3>
          <div className="flex items-center mb-2">
            <div className="flex-1">
              <p>
                Loaded {activeTraceData.progress.loaded.get()} of{' '}
                {activeTraceData.progress.total.get()} transactions
              </p>
              {activeTraceData.error.get() && (
                <div className="text-red-500 mt-2">{activeTraceData.error.get()}</div>
              )}
            </div>
            {activeTraceData.loading.get() &&
              activeTraceData.abortController.get() &&
              activeItem?.remoteId && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => abortRemoteTrace(activeItem.remoteId!)}
                >
                  Cancel
                </Button>
              )}
          </div>
        </div>
      )}
    </div>
  )
}
