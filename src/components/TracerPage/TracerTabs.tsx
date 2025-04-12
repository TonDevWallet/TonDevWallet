import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/cn'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faPen } from '@fortawesome/free-solid-svg-icons'
import {
  useTracerItems,
  useActiveItemId,
  setActiveItem,
  removeTracerItem,
  renameTracerItem,
} from '@/store/tracerState'

export function TracerTabs() {
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string>('')
  const tabsContainerRef = useRef<HTMLDivElement>(null)

  const tracerItems = useTracerItems()
  const activeItemId = useActiveItemId()

  // Handle horizontal scrolling with mousewheel
  useEffect(() => {
    const container = tabsContainerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault()
        container.scrollLeft += e.deltaY
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [])

  const handleItemSelect = (id: string) => {
    setActiveItem(id)
  }

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeTracerItem(id)
  }

  const handleStartEditName = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingItemId(id)
    setEditingName(currentName)
  }

  const handleSaveItemName = (id: string) => {
    if (editingName.trim()) {
      renameTracerItem(id, editingName.trim())
    }
    setEditingItemId(null)
  }

  if (tracerItems.get()?.length === 0) {
    return null
  }

  return (
    <div ref={tabsContainerRef} className="border-b overflow-x-auto scrollbar-hide">
      <div className="flex">
        {tracerItems.get().map((item) => (
          <div
            key={item.id}
            className={cn(
              'px-4 py-2 flex items-center border-r cursor-pointer',
              activeItemId.get() === item.id
                ? 'bg-primary/10 border-b-2 border-b-primary'
                : 'hover:bg-muted/80'
            )}
            onClick={() => handleItemSelect(item.id)}
          >
            {editingItemId === item.id ? (
              <div className="flex-1 min-w-[100px]">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleSaveItemName(item.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveItemName(item.id)}
                  autoFocus
                  className="h-7 w-full"
                />
              </div>
            ) : (
              <span className="flex-1 truncate mr-2">{item.name}</span>
            )}
            <div className="flex gap-1 ml-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={(e) => handleStartEditName(item.id, item.name, e)}
              >
                <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive"
                onClick={(e) => handleRemoveItem(item.id, e)}
              >
                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
