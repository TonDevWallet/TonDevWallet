import { createRoot } from 'react-dom/client'
import { App } from './app'
import './index.css'

import '@hookstate/devtools'

import { getDatabase, InitDB } from './db'
import './store/walletState'

const db = getDatabase()

await InitDB()

// const sql = await db.select('SELECT 1')
// console.log('sql', sql, 1)

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(document.getElementById('app')!)
root.render(<App db={db} />)
