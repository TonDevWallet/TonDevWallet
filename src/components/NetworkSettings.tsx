import { changeLiteClient, LiteClientState } from '@/store/liteClient'
import { useHookstate } from '@hookstate/core'

export function NetworkSettings() {
  const liteClientState = useHookstate(LiteClientState)

  return (
    <div className="my-2">
      <div className="flex">
        <label htmlFor="apiKeyInput">Testnet:</label>
        <input
          className="ml-2 bg-gray-200 rounded"
          type="checkbox"
          id="apiKeyInput"
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
