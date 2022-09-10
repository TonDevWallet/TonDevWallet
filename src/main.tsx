import { createRoot } from 'react-dom/client'
import { App } from './app'
import './index.css'

import { createDatabase } from './db'

const db = await createDatabase()

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(document.getElementById('app')!)
root.render(<App db={db} />)
