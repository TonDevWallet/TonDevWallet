// import { useEffect, useState } from 'react'

// export function NetworkSettings({
//   apiUrl,
//   setApiUrl,
//   apiKey,
//   setApiKey,
// }: {
//   apiUrl: string
//   setApiUrl: (v: string) => void
//   apiKey: string
//   setApiKey: (v: string) => void
// }) {
//   const [init, setInit] = useState(false)

//   // On mount load nfts and config if exists
//   // useEffect(() => {
//   //   setTimeout(() => setInit(true), 128)

//   //   if (window.localStorage) {
//   //     const localApiUrl = window.localStorage.getItem('tonwallgen_apiurl')
//   //     const localApikey = window.localStorage.getItem('tonwallgen_apikey')

//   //     if (localApiUrl) {
//   //       setApiUrl(localApiUrl)
//   //     }

//   //     if (localApikey) {
//   //       setApiKey(localApikey)
//   //     }
//   //   }
//   // }, [])

//   // Set testnet and api to localstorage on change
//   // useEffect(() => {
//   //   if (!init) {
//   //     return
//   //   }

//   //   if (window.localStorage) {
//   //     window.localStorage.setItem('tonwallgen_apiurl', apiUrl)
//   //     window.localStorage.setItem('tonwallgen_apikey', apiKey)
//   //   }
//   // }, [apiKey, apiUrl])

//   return (
//     <div className="flex flex-col gap-2 my-2">
//       <div className="flex">
//         <label htmlFor="testnetCheckbox">ApiUrl: </label>
//         <input
//           type="text"
//           id="testnetCheckbox"
//           className="border rounded px-2 w-full"
//           value={apiUrl}
//           onChange={(e: any) => setApiUrl(e.target.value)}
//         />
//       </div>

//       <div className="flex">
//         <label htmlFor="apiKeyInput">ApiKey: </label>
//         <input
//           type="text"
//           id="apiKeyInput"
//           className="border rounded px-2 w-full"
//           value={apiKey}
//           onChange={(e: any) => setApiKey(e.target.value)}
//         />
//       </div>
//     </div>
//   )
// }

import { changeLiteClient, LiteClientState } from '@/store/liteClient'
// import { useTonClient } from '@/store/tonClient'
import { useHookstate } from '@hookstate/core'
// import { useState, useEffect } from 'react'
// import { TonClient } from 'ton'

export function NetworkSettings() {
  // const [apiKey, setApiKey] = useState('')
  // const [endpoint, setEndpoint] = useState('https://mainnet.tonhubapi.com/jsonRPC')
  const liteClientState = useHookstate(LiteClientState)

  // const tonClient = useTonClient()

  // useEffect(() => {
  //   tonClient.set(
  //     new TonClient({
  //       endpoint,
  //       apiKey,
  //     })
  //   )
  // }, [apiKey, endpoint])

  return (
    <div className="my-2">
      {/* <div>
        <label htmlFor="apiEndpointInput">API Endpoint:</label>
        <input
          className="w-full px-2 py-2 bg-gray-200 rounded"
          type="text"
          id="apiEndpointInput"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="apiKeyInput">API Key:</label>
        <input
          className="w-full px-2 py-2 bg-gray-200 rounded"
          type="text"
          id="apiKeyInput"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div> */}
      Test {liteClientState.testnet.get()}
      <div>
        <label htmlFor="apiKeyInput">Testnet:</label>
        <input
          className="w-full px-2 py-2 bg-gray-200 rounded"
          type="checkbox"
          id="apiKeyInput"
          // value={liteClientState.testnet.get() ? 'checked' : 'checked'}
          defaultChecked={liteClientState.testnet.get()}
          onChange={(e) => {
            console.log('e', e.target.value)
            changeLiteClient(!liteClientState.testnet.get())
          }}
        />
      </div>
    </div>
  )
}
