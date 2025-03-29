import { hookstate, useHookstate } from '@hookstate/core'

// Create a global state for the search query
const searchState = hookstate<{
  wallet: string
}>({
  wallet: '',
})

export function useSearchState() {
  return useHookstate(searchState)
}

export function setSearchQuery(query: string) {
  searchState.wallet.set(query)
}

export function useSearchQuery() {
  return searchState.wallet
}

export function getSearchQuery() {
  return searchState.wallet.get()
}

export function clearSearchQuery() {
  searchState.wallet.set('')
}
