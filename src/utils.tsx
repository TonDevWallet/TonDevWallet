import TonWeb from 'tonweb'

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const getProvider = (key: string | null = null, testnet = false) => {
  const apiKey = key ? `?api_key=${key}` : ''
  const host = testnet
    ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
    : 'https://toncenter.com/api/v2/jsonRPC'

  return new TonWeb.HttpProvider(`${host}${apiKey}`)
}
