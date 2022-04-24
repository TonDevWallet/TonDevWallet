import { useEffect, useState } from 'preact/hooks'

export function NetworkSettings({
  testnet,
  setTestnet,
  apiKey,
  setApiKey,
}: {
  testnet: boolean
  setTestnet: (v: boolean) => void
  apiKey: string
  setApiKey: (v: string) => void
}) {
  const [init, setInit] = useState(false)

  // On mount load nfts and config if exists
  useEffect(() => {
    setTimeout(() => setInit(true), 128)

    if (window.localStorage) {
      const localTestnet = window.localStorage.getItem('tonwallgen_testnet')
      const localApikey = window.localStorage.getItem('tonwallgen_apikey')

      if (localTestnet) {
        setTestnet(localTestnet === 'true')
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
      window.localStorage.setItem('tonwallgen_testnet', testnet.toString())
      window.localStorage.setItem('tonwallgen_apikey', apiKey)
    }
  }, [apiKey, testnet])

  return (
    <div className="flex my-2 items-center">
      <div>
        <label htmlFor="testnetCheckbox">Testnet: </label>
        <input
          type="checkbox"
          id="testnetCheckbox"
          checked={testnet}
          onChange={() => setTestnet(!testnet)}
        />
      </div>

      <div className="ml-2">
        <label htmlFor="apiKeyInput">ApiKey: </label>
        <input
          type="text"
          id="apiKeyInput"
          className="border rounded px-2"
          value={apiKey}
          onChange={(e: any) => setApiKey(e.target.value)}
        />
      </div>
    </div>
  )
}
