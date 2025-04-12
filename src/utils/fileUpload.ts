import { DeserializeTransactionsList } from '@/utils/txSerializer'
import { addTracerItem } from '@/store/tracerState'

export const processTracerJsonFile = async (file: File): Promise<boolean> => {
  if (!file) return false

  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const parsedData = DeserializeTransactionsList(JSON.stringify(data))
    const timestamp = new Date().toLocaleTimeString()
    addTracerItem(`File Upload (${timestamp})`, parsedData)
    return true
  } catch (error) {
    console.error('Error loading graph file:', error)
    alert("Error loading file. Please make sure it's a valid graph JSON file.")
    return false
  }
}
