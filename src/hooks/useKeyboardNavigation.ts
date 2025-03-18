import { useEffect, useCallback } from 'react'

interface UseKeyboardNavigationOptions {
  selectedIndex: number
  itemsCount: number
  onSelect: (index: number) => void
  enabled?: boolean
  keys?: {
    up?: string[]
    down?: string[]
  }
}

export function useKeyboardNavigation({
  selectedIndex,
  itemsCount,
  onSelect,
  enabled = true,
  keys = {
    up: ['ArrowUp'],
    down: ['ArrowDown'],
  },
}: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || itemsCount <= 0) return

      if (keys.up?.includes(event.key)) {
        event.preventDefault()
        const newIndex = selectedIndex <= 0 ? itemsCount - 1 : selectedIndex - 1
        onSelect(newIndex)
      } else if (keys.down?.includes(event.key)) {
        event.preventDefault()
        const newIndex = selectedIndex >= itemsCount - 1 ? 0 : selectedIndex + 1
        onSelect(newIndex)
      }
    },
    [selectedIndex, itemsCount, onSelect, enabled, keys]
  )

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [handleKeyDown, enabled])

  // Function to scroll selected item into view
  const scrollIntoView = useCallback((elementId: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [])

  return { scrollIntoView }
}
