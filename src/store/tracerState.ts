import { hookstate, useHookstate } from '@hookstate/core'
import { ParsedTransaction } from '@/utils/ManagedBlockchain'

export interface GraphData {
  transactions: ParsedTransaction[]
}

export interface TracerItem {
  id: string
  name: string
  selectedTx: ParsedTransaction | null
  graphData: GraphData | null
}

const state = hookstate<{
  items: TracerItem[]
  activeItemId: string | null
}>({
  items: [],
  activeItemId: null,
})

export function useTracerState() {
  return useHookstate(state)
}

export function useTracerItems() {
  const tracerState = useHookstate(state)
  return tracerState.items
}

export function useActiveItemId() {
  const tracerState = useHookstate(state)
  return tracerState.activeItemId
}

export function useActiveItem({ noproxy }: { noproxy?: boolean } = {}) {
  const tracerState = useHookstate(state)
  const activeId = tracerState.activeItemId.get()

  if (!activeId) return null

  const items = tracerState.items.get({ noproxy })
  return items.find((item) => item.id === activeId)
}

export function useGraphData({ noproxy }: { noproxy?: boolean } = {}) {
  const activeItem = useActiveItem({ noproxy })
  return activeItem?.graphData || null
}

export function useSelectedTx() {
  const activeItem = useActiveItem()
  return activeItem?.selectedTx || null
}

export function addTracerItem(name: string, data: GraphData | null) {
  const id = Date.now().toString()
  const newItem: TracerItem = {
    id,
    name,
    selectedTx: null,
    graphData: data,
  }

  state.items.merge([newItem])
  state.activeItemId.set(id)

  return id
}

export function setActiveItem(id: string) {
  state.activeItemId.set(id)
}

export function setGraphData(data: GraphData | null) {
  const activeId = state.activeItemId.get()
  if (!activeId) return

  const index = state.items.get().findIndex((item) => item.id === activeId)
  if (index === -1) return

  state.items[index].graphData.set(data)
}

export function setSelectedTx(tx: ParsedTransaction | null) {
  const activeId = state.activeItemId.get()
  if (!activeId) return

  const index = state.items.get().findIndex((item) => item.id === activeId)
  if (index === -1) return

  state.items[index].selectedTx.set(tx)
}

export function removeTracerItem(id: string) {
  const items = state.items.get()
  const filteredItems = items.filter((item) => item.id !== id)
  state.items.set(filteredItems)

  if (state.activeItemId.get() === id) {
    state.activeItemId.set(filteredItems.length > 0 ? filteredItems[0].id : null)
  }
}

export function renameTracerItem(id: string, newName: string) {
  const index = state.items.get().findIndex((item) => item.id === id)
  if (index === -1) return

  state.items[index].name.set(newName)
}

export function clearTracerState() {
  state.items.set([])
  state.activeItemId.set(null)
}
