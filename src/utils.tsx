import { useMemo } from 'preact/hooks'
import TonWeb from 'tonweb'

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getProvider = (apiUrl: string, key: string | undefined) => {
  return new TonWeb.HttpProvider(apiUrl, { apiKey: key })
}

export const useProvider = (apiUrl: string, key: string | undefined) => {
  return useMemo(() => getProvider(apiUrl, key), [apiUrl, key])
}
