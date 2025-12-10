import { useEffect } from 'react'
import { useNavigate, NavigateFunction } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { ConnectRequest } from '@tonconnect/protocol'
import { getPasswordInteractive } from '@/store/passwordManager'

interface UseClipboardTonConnectOptions {
  onStartConnect: (link: string) => void
}

/**
 * Handles clipboard paste events for TonConnect QR codes and deep links.
 * Also listens for tonconnect_svg Tauri events from browser extension.
 */
export function useClipboardTonConnect({ onStartConnect }: UseClipboardTonConnectOptions) {
  const navigate = useNavigate()

  // Handle paste events (images with QR codes or text with TonConnect URLs)
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event?.clipboardData?.items
      if (!items) return

      for (const index in items) {
        const item = items[index]

        if (item.kind === 'file') {
          await handleImagePaste(item, onStartConnect)
        } else if (item.kind === 'string' && item.type === 'text/plain') {
          item.getAsString((pastedString: string) =>
            handleTextPaste(pastedString, navigate, onStartConnect)
          )
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [navigate, onStartConnect])

  // Handle tonconnect_svg events from Tauri (browser extension QR detection)
  useEffect(() => {
    const unlisten = listen('tonconnect_svg', async ({ payload }) => {
      const imageBase64 = (payload as { data: { image: string } }).data.image
      const qrCodes = await detectQrCode(imageBase64)

      if (qrCodes.length > 0) {
        console.log('Found QR code from tonconnect_svg', qrCodes)
        const password = await getPasswordInteractive()
        if (password) {
          onStartConnect(qrCodes[0])
        }
      }
    })

    return () => {
      unlisten.then((f) => f())
    }
  }, [onStartConnect])
}

async function handleImagePaste(item: DataTransferItem, onStartConnect: (link: string) => void) {
  const blob = item.getAsFile()
  if (!blob) return

  const reader = new FileReader()
  reader.onload = async (event) => {
    const result = event.target?.result as string | undefined
    if (!result) return

    const base64Data = result.split(',')[1]
    const qrCodes = await detectQrCode(base64Data)

    if (qrCodes.length > 0) {
      console.log('Found QR code from pasted image', qrCodes)
      const password = await getPasswordInteractive()
      if (password) {
        onStartConnect(qrCodes[0])
      }
    }
  }
  reader.readAsDataURL(blob)
}

async function handleTextPaste(
  pastedString: string,
  navigate: NavigateFunction,
  onStartConnect: (link: string) => void
) {
  // Handle trace deep links
  if (pastedString.includes('tondevwallet://trace/')) {
    const traceId = pastedString.split('tondevwallet://trace/')[1]
    if (traceId) {
      console.log('traceId', pastedString, traceId)
      navigate('/app/tracer', { state: { traceId } })
    }
    return
  }

  // Check for TonConnect URL pattern
  if (!pastedString.includes('id') || !pastedString.includes('manifestUrl')) {
    return
  }

  try {
    const parsed = new URL(pastedString)
    const clientId = parsed.searchParams.get('id') || ''
    const rString = parsed.searchParams.get('r')
    const r = rString ? (JSON.parse(rString) as ConnectRequest) : undefined

    if (r?.manifestUrl && clientId) {
      const password = await getPasswordInteractive()
      if (password) {
        onStartConnect(pastedString)
      }
    }
  } catch {
    // Invalid URL, ignore
  }
}

async function detectQrCode(base64Data: string): Promise<string[]> {
  return invoke('detect_qr_code_from_image', { data: base64Data }) as Promise<string[]>
}
