import { createRoot } from 'react-dom/client'
import { App } from './app'

import '@hookstate/devtools'

import { getDatabase } from './db'
import './store/walletState'

import { ADNLClientWS } from 'adnl'
import { TLWriteBuffer, TLReadBuffer, TLBytes, TLCodec, TLInt256, TLFunction } from 'ton-tl'

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

export interface devwallet_ok_empty {
  readonly kind: 'devwallet.ok_empty'
}

export type devwallet_Ok = devwallet_ok_empty

export interface devwallet_ok {
  readonly kind: 'devwallet.ok'
}

export interface devwallet_sendProxyTransaction {
  readonly kind: 'devwallet.sendProxyTransaction'
  readonly txJsonData: TLBytes
}

export interface adnl_message_answer {
  readonly kind: 'adnl.message.answer'
  readonly queryId: TLInt256
  readonly answer: TLBytes
}

export interface adnl_message_query {
  readonly kind: 'adnl.message.query'
  readonly queryId: TLInt256
  readonly query: TLBytes
}

export type adnl_Message = adnl_message_query | adnl_message_answer

const Functions = {
  devwallet_sendProxyTransaction: {
    encodeRequest: (src: devwallet_sendProxyTransaction, encoder: TLWriteBuffer) => {
      encoder.writeInt32(787547779)
      Codecs.devwallet_sendProxyTransaction.encode(src, encoder)
    },
    decodeResponse: (decoder: TLReadBuffer) => Codecs.devwallet_Ok.decode(decoder),
  } as TLFunction<devwallet_sendProxyTransaction, devwallet_Ok>,
}

const Codecs = {
  devwallet_ok_empty: {
    encode: (src: devwallet_ok_empty, encoder: TLWriteBuffer) => {},
    decode: (decoder: TLReadBuffer): devwallet_ok_empty => {
      return { kind: 'devwallet.ok_empty' }
    },
  } as TLCodec<devwallet_ok_empty>,
  devwallet_sendProxyTransaction: {
    encode: (src: devwallet_sendProxyTransaction, encoder: TLWriteBuffer) => {
      encoder.writeBuffer(src.txJsonData)
    },
    decode: (decoder: TLReadBuffer): devwallet_sendProxyTransaction => {
      const txJsonData = decoder.readBuffer()
      return { kind: 'devwallet.sendProxyTransaction', txJsonData }
    },
  } as TLCodec<devwallet_sendProxyTransaction>,
  devwallet_Ok: {
    encode: (src: devwallet_Ok, encoder: TLWriteBuffer) => {
      const kind = src.kind
      if (kind === 'devwallet.ok_empty') {
        encoder.writeInt32(881324045)
        Codecs.devwallet_ok_empty.encode(src, encoder)
        return
      }
      throw Error('Unknown type: ' + kind)
    },
    decode: (decoder: TLReadBuffer): devwallet_Ok => {
      const kind = decoder.readInt32()
      if (kind === 881324045) {
        return Codecs.devwallet_ok_empty.decode(decoder)
      }
      throw Error('Unknown type: ' + kind)
    },
  } as TLCodec<devwallet_Ok>,
  adnl_message_query: {
    encode: (src: adnl_message_query, encoder: TLWriteBuffer) => {
      encoder.writeInt256(src.queryId)
      encoder.writeBuffer(src.query)
    },
    decode: (decoder: TLReadBuffer): adnl_message_query => {
      const queryId = decoder.readInt256()
      const query = decoder.readBuffer()
      return { kind: 'adnl.message.query', queryId, query }
    },
  } as TLCodec<adnl_message_query>,
  adnl_message_answer: {
    encode: (src: adnl_message_answer, encoder: TLWriteBuffer) => {
      encoder.writeInt256(src.queryId)
      encoder.writeBuffer(src.answer)
    },
    decode: (decoder: TLReadBuffer): adnl_message_answer => {
      const queryId = decoder.readInt256()
      const answer = decoder.readBuffer()
      return { kind: 'adnl.message.answer', queryId, answer }
    },
  } as TLCodec<adnl_message_answer>,
  adnl_Message: {
    encode: (src: adnl_Message, encoder: TLWriteBuffer) => {
      const kind = src.kind
      if (kind === 'adnl.message.query') {
        encoder.writeInt32(-1265895046)
        Codecs.adnl_message_query.encode(src, encoder)
        return
      }
      if (kind === 'adnl.message.answer') {
        encoder.writeInt32(262964246)
        Codecs.adnl_message_answer.encode(src, encoder)
        return
      }
      throw Error('Unknown type: ' + kind)
    },
    decode: (decoder: TLReadBuffer): adnl_Message => {
      const kind = decoder.readInt32()
      if (kind === -1265895046) {
        return Codecs.adnl_message_query.decode(decoder)
      }
      if (kind === 262964246) {
        return Codecs.adnl_message_answer.decode(decoder)
      }
      throw Error('Unknown type: ' + kind)
    },
  } as TLCodec<adnl_Message>,
}

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
        const jsonData = JSON.stringify({
          hello: 'world',
        })
        const encoder = new TLWriteBuffer()
        Functions.devwallet_sendProxyTransaction.encodeRequest(
          { kind: 'devwallet.sendProxyTransaction', txJsonData: Buffer.from(jsonData) },
          encoder
        )
        const build = encoder.build()

        const msgEncoder = new TLWriteBuffer()
        Codecs.adnl_Message.encode(
          { kind: 'adnl.message.query', queryId: Buffer.from(Array(32).fill(1)), query: build },
          msgEncoder
        )
        const msgBuild = msgEncoder.build()
        console.log('build', build.length, Buffer.from(TL_GETTIME).length, msgBuild.length)
        clientWSProxy.write(msgBuild)
      }, 3000)
    })
  await clientWSProxy.connect()
}
adnltest()
