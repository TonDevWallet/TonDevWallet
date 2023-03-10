// import { useProvider } from '../../../utils'
import SendMessage from './SendMessage'

function Wallet() {
  // const provider = useProvider(apiUrl, apiKey)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col">
        <div className="font-medium text-lg text-accent my-2">Wallet:</div>
        <div>Type: external</div>
      </div>

      <SendMessage />
    </div>
  )
}

export default Wallet
