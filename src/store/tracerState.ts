import { hookstate, none, useHookstate } from '@hookstate/core'
import { ParsedTransaction } from '@/utils/ManagedBlockchain'
import { uuidv7 } from '@/utils/uuidv7'

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
  const id = uuidv7()
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

  const currentIndex = items.findIndex((item) => item.id === id)

  const filteredItemsIndices = items.map((item, index) => (item.id === id ? index : undefined))
  // .filter((i) => typeof i === 'number')
  const filteredItemsIndicesNumbers = filteredItemsIndices.filter((i) => typeof i === 'number')

  console.log('filteredItemsIndices', id, items, filteredItemsIndices, filteredItemsIndicesNumbers)
  for (const i of filteredItemsIndicesNumbers) {
    state.items[i].set(none)
  }

  if (state.activeItemId.get() === id) {
    if (state.items.length > 0) {
      state.activeItemId.set(state.items[currentIndex - 1].id.get())
    } else {
      state.activeItemId.set(null)
    }
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
