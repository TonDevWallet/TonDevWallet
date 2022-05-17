import { useEffect, useState } from 'react'

export function NetworkSettings({
  apiUrl,
  setApiUrl,
  apiKey,
  setApiKey,
}: {
  apiUrl: string
  setApiUrl: (v: string) => void
  apiKey: string
  setApiKey: (v: string) => void
}) {
  const [init, setInit] = useState(false)

  // On mount load nfts and config if exists
  useEffect(() => {
    setTimeout(() => setInit(true), 128)

    if (window.localStorage) {
      const localApiUrl = window.localStorage.getItem('tonwallgen_apiurl')
      const localApikey = window.localStorage.getItem('tonwallgen_apikey')

      if (localApiUrl) {
        setApiUrl(localApiUrl)
      }

      if (localApikey) {
        setApiKey(localApikey)
      }
    }
  }, [])

  // Set testnet and api to localstorage on change
  useEffect(() => {
    if (!init) {
      return
    }

    if (window.localStorage) {
      window.localStorage.setItem('tonwallgen_apiurl', apiUrl)
      window.localStorage.setItem('tonwallgen_apikey', apiKey)
    }
  }, [apiKey, apiUrl])

  return (
    <div className="flex flex-col gap-2 my-2">
      <div className="flex">
        <label htmlFor="testnetCheckbox">ApiUrl: </label>
        <input
          type="text"
          id="testnetCheckbox"
          className="border rounded px-2 w-full"
          value={apiUrl}
          onChange={(e: any) => setApiUrl(e.target.value)}
        />
      </div>

      <div className="flex">
        <label htmlFor="apiKeyInput">ApiKey: </label>
        <input
          type="text"
          id="apiKeyInput"
          className="border rounded px-2 w-full"
          value={apiKey}
          onChange={(e: any) => setApiKey(e.target.value)}
        />
      </div>
    </div>
  )
}
