import { createRoot } from 'react-dom/client'
import { App } from './app'
import './index.css'

import { getDatabase } from './db'

const db = await getDatabase()

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(document.getElementById('app')!)
root.render(<App db={db} />)
