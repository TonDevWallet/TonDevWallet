import { FileUploadArea } from './FileUploadArea'
import { RemoteTracerViewer } from './RemoteTracerViewer'
import { processTracerJsonFile } from '@/utils/fileUpload'

export function TracerUploadArea() {
  const handleFileProcessed = (jsonData: any) => {
    // Pass the raw parsed JSON to the processor
    const file = new File([JSON.stringify(jsonData)], 'upload.json', { type: 'application/json' })
    processTracerJsonFile(file)
  }

  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Upload Trace File</h2>
      <FileUploadArea onFileProcessed={handleFileProcessed} />

      <h2 className="text-xl font-semibold mb-4 mt-6">Emulate transaction from chain</h2>
      <RemoteTracerViewer />
    </div>
  )
}
