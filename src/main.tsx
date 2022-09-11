import { createRoot } from 'react-dom/client'
import { App } from './app'
import './index.css'

import { getDatabase } from './db'
import liteClient, { initLiteClient } from './liteClient'

const db = await getDatabase()

initLiteClient()

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(document.getElementById('app')!)
root.render(<App db={db} liteClient={liteClient} />)
