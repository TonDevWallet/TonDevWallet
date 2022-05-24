import express from 'express'
import TonWeb from 'tonweb'
import nacl from 'tweetnacl'
import { TxResponseOptions } from './types/TxRequest'

const { NftSale } = TonWeb.token.nft
const { Cell } = TonWeb.boc

const app = express()

app.get('/api/sale/:market/:collection/:nft', async (req, res) => {
  const { market, collection, nft } = req.params

  const provider = new TonWeb.HttpProvider('')
  const sale = new NftSale(provider, {
    marketplaceAddress: new TonWeb.utils.Address(market),
    nftAddress: new TonWeb.utils.Address(nft),
    fullPrice: TonWeb.utils.toNano('1.1'),
    marketplaceFee: TonWeb.utils.toNano('0.2'),
    royaltyAddress: new TonWeb.utils.Address(collection),
    royaltyAmount: TonWeb.utils.toNano('0.1'),
  })

  const saleStateInit = (await sale.createStateInit()).stateInit
  const saleMessageBody = new TonWeb.boc.Cell()

  const bodyCell = new Cell()
  bodyCell.refs.push(saleStateInit)
  bodyCell.refs.push(saleMessageBody)

  const seed = '4ac84186cfa6f626afe1f887f77d1b9053dd346babe90720d96b67d7d5345d90'
  const marketKey = TonWeb.utils.nacl.sign.keyPair.fromSeed(Buffer.from(seed, 'hex'))
  // const signature = sign(bodyCell.hash(), params.keyPair.secretKey)
  const signature = nacl.sign.detached(await bodyCell.hash(), marketKey.secretKey)

  const msgBody = new Cell()
  msgBody.bits.writeUint(1, 32)
  msgBody.bits.writeBytes(signature)
  msgBody.refs.push(saleStateInit)
  msgBody.refs.push(saleMessageBody)

  const boc = await msgBody.toBoc()
  const signed = Buffer.from(boc).toString('hex')
  // setSignature(Buffer.from(boc).toString('hex'))
  // const signature = 'abcd' // setSignature('abcd')

  const body = getGetgemsNFTSaleBody(
    market,
    collection,
    nft,
    signed,
    {
      broadcast: true,
      return_url: 'http://localhost:3000',
      callback_url: 'http://localhost:3000',
    },
    60
  )
  res.json(body)
})

const getGetgemsNFTSaleBody = (
  marketplaceAddress: string,
  collectionAddress: string,
  nftAddress: string,
  signature: string,
  responseOptions: TxResponseOptions,
  expiresSec: number
) => ({
  version: '0',
  body: {
    type: 'nft-sale-place-getgems',
    params: {
      marketplaceFeeAddress: marketplaceAddress,
      marketplaceFee: '50000000',
      royaltyAddress: collectionAddress,
      royaltyAmount: '10000000',
      createdAt: Math.floor(Date.now() / 1000),
      marketplaceAddress: marketplaceAddress,
      nftItemAddress: nftAddress,
      ownerAddress: collectionAddress,
      fullPrice: '1000000000',
      marketplaceSignatureHex: signature,

      saleMessageBocHex: '',
      forwardAmount: '30000000',
      transferAmount: '30000000',
      deployAmount: '30000000',
    },
    response_options: responseOptions,
    expires_sec: expiresSec,
  },
})

export const handler = app
