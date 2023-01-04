// // import { useMemo } from 'react'
// // import { HttpProvider } from 'tonweb/dist/types/providers/http-provider'
// // // import TonWeb from 'tonweb'
// // import { RateLimitedHttpProvider } from './utils/RateLimitedHttpProvider'

// import { useMemo } from 'react'
// import TonWeb from 'tonweb'
// import { HttpProvider } from 'tonweb/dist/types/providers/http-provider'
// import { RateLimitedHttpProvider } from './utils/RateLimitedHttpProvider'

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// const getProvider = (apiUrl: string, key: string | undefined) => {
//   return new RateLimitedHttpProvider(apiUrl, { apiKey: key })
// }

// // export const useProvider = (apiUrl, key) => {
// //   // return new TonWeb.HttpProvider()
// //   console.log('get provider', apiUrl)
// //   return useMemo(() => getProvider(apiUrl, key) as unknown as HttpProvider, [apiUrl, key])
// // }
