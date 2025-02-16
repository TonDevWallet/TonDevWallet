import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { faUpload } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { cn } from '@/utils/cn'

interface FileUploadAreaProps {
  onFileProcessed: (data: any) => void
}

export function FileUploadArea({ onFileProcessed }: FileUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      onFileProcessed(data)
    } catch (error) {
      console.error('Error loading graph file:', error)
      alert("Error loading file. Please make sure it's a valid graph JSON file.")
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <label
      className={cn(
        'flex flex-col items-center justify-center w-full mb-8 border-2 border-dashed rounded-lg p-8 text-center transition-colors',
        'border-muted-foreground/25 hover:border-primary/50',
        'cursor-pointer'
      )}
      htmlFor="file-input"
    >
      <div className="flex flex-col items-center">
        <FontAwesomeIcon icon={faUpload} className="text-4xl mb-4 text-muted-foreground" />
        <div className="text-lg mb-2">Select your graph.json file</div>
        <Button variant="outline" onClick={handleButtonClick}>
          Choose File
        </Button>
        <input
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
          ref={fileInputRef}
          id="file-input"
        />
      </div>
    </label>
  )
}
