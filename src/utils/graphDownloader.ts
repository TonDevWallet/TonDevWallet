import { SerializeTransactionsList } from './txSerializer'
import { save } from '@tauri-apps/api/dialog'
import { writeTextFile } from '@tauri-apps/api/fs'

export async function downloadGraph(transactions: any[]) {
  try {
    if (!transactions || transactions.length === 0) {
      console.warn('No transactions to download')
      return
    }

    const dump = SerializeTransactionsList(transactions)

    // Use Tauri file dialog to get the save path
    try {
      // Open save dialog and get a path from the user
      const filePath = await save({
        filters: [
          {
            name: 'JSON',
            extensions: ['json'],
          },
        ],
        defaultPath: 'graph.json',
      })

      if (filePath) {
        console.log('saving filePath', filePath)
        // Write the file to the selected path
        await writeTextFile(filePath, dump)
        console.log('File saved successfully to:', filePath)
      } else {
        console.log('Save dialog was canceled')
      }
    } catch (fsError) {
      console.error('Tauri file system error:', fsError)

      // Fallback to browser method if Tauri API fails or is not available
      const blob = new Blob([dump], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'graph.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  } catch (error) {
    console.error('Error downloading graph:', error)
  }
}
