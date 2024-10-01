import { createRoot } from 'react-dom/client'
import { App } from './app'
import './index.scss'

import '@hookstate/devtools'

import { getDatabase } from './db'
import './store/walletState'

async function main() {
  const db = await getDatabase()

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const root = createRoot(document.getElementById('app')!)
  root.render(<App db={db} />)
}
main().catch((err) => {
  console.error(err)
})
