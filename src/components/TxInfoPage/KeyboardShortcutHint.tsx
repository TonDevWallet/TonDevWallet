import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKeyboard } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/utils/cn'

export function KeyboardShortcutHint() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Show the hint after a brief delay
    const showTimer = setTimeout(() => {
      setVisible(true)
    }, 1000)

    // Hide the hint after a few seconds
    const hideTimer = setTimeout(() => {
      setVisible(false)
    }, 6000)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  return (
    <div
      className={cn(
        'fixed bottom-5 right-5 bg-popover border border-border shadow-lg rounded-lg p-3 z-50 transition-all duration-300',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <FontAwesomeIcon icon={faKeyboard} className="text-primary" />
        <span className="font-medium">Keyboard Navigation Available</span>
      </div>
      <div className="grid grid-cols-[70px_1fr] gap-1 text-sm">
        <span className="font-mono bg-accent px-1 rounded">↑ / k</span>
        <span>Previous instruction</span>
        <span className="font-mono bg-accent px-1 rounded">↓ / j</span>
        <span>Next instruction</span>
      </div>
    </div>
  )
}
