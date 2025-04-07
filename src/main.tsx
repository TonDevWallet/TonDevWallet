import { createRoot } from 'react-dom/client'
import { App } from './app'

import '@hookstate/devtools'

import { getDatabase } from './db'
import './store/walletState'

import { ADNLClientWS } from 'adnl'

const ADNL_PUB_KEY = Buffer.from('rFX_TudHJ5aS6Lr-EdBN_nq0xb4_AdjFp8vburxfoSM', 'base64')

const TL_GETTIME =
  '7af98bb435263e6c95d6fecb497dfd0aa5f031e7d412986b5ce720496db512052e8f2d100cdf068c7904345aad16000000000000'

async function main() {
  const db = await getDatabase()

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const root = createRoot(document.getElementById('app')!)
  root.render(<App db={db} />)
}
main().catch((err) => {
  console.error(err)
})

const URL_PROXY = 'ws://localhost:33001'
async function adnltest() {
  console.log('adnltest')
  const clientWSProxy = new ADNLClientWS(URL_PROXY, ADNL_PUB_KEY)
    .on('connect', () => console.log('on connect'))
    .on('close', () => console.log('on close'))
    .on('data', (data: Buffer) => console.log('on data:', data))
    .on('error', (error: Error) => console.log('on error:', error))
    .on('ready', () => {
      // const counter = 0
      setInterval(() => {
        clientWSProxy.write(Buffer.from(TL_GETTIME, 'hex'))
      }, 3000)
    })
  await clientWSProxy.connect()
}
adnltest()
