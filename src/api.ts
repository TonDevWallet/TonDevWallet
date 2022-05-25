import express from 'express'
import TonWeb from 'tonweb'
import nacl from 'tweetnacl'
import { buildNftFixPriceSaleV2StateInit } from './contracts/NftFixpriceSaleV2.data'
import { TxResponseOptions } from './types/TxRequest'
import { Address, Cell } from 'ton'
import BN from 'bn.js'

// const { NftSale } = TonWeb.token.nft
// const { Cell } = TonWeb.boc

const app = express()

app.get('/api/sale/:market/:collection/:nft/:owner', async (req, res) => {
  const { market, collection, nft, owner } = req.params

  // const provider = new TonWeb.HttpProvider('')
  // const sale = new NftSale(provider, {
  //   marketplaceAddress: new TonWeb.utils.Address(market),
  //   nftAddress: new TonWeb.utils.Address(nft),
  //   fullPrice: TonWeb.utils.toNano('1.1'),
  //   marketplaceFee: TonWeb.utils.toNano('0.2'),
  //   royaltyAddress: new TonWeb.utils.Address(collection),
  //   royaltyAmount: TonWeb.utils.toNano('0.1'),
  // })

  // const saleStateInit = (await sale.createStateInit()).stateInit
  // const saleMessageBody = new TonWeb.boc.Cell()

  // const bodyCell = new Cell()
  // bodyCell.refs.push(saleStateInit)
  // bodyCell.refs.push(saleMessageBody)

  // const seed = '4ac84186cfa6f626afe1f887f77d1b9053dd346babe90720d96b67d7d5345d90'
  // const marketKey = TonWeb.utils.nacl.sign.keyPair.fromSeed(Buffer.from(seed, 'hex'))
  // // const signature = sign(bodyCell.hash(), params.keyPair.secretKey)
  // const signature = nacl.sign.detached(await bodyCell.hash(), marketKey.secretKey)

  // const msgBody = new Cell()
  // msgBody.bits.writeUint(1, 32)
  // msgBody.bits.writeBytes(signature)
  // msgBody.refs.push(saleStateInit)
  // msgBody.refs.push(saleMessageBody)

  // const boc = await msgBody.toBoc()
  // const signed = Buffer.from(boc).toString('hex')
  // // setSignature(Buffer.from(boc).toString('hex'))
  // // const signature = 'abcd' // setSignature('abcd')

  // const body = getGetgemsNFTSaleBody(
  //   market,
  //   collection,
  //   nft,
  //   signed,
  //   {
  //     broadcast: true,
  //     return_url: 'http://localhost:3000',
  //     callback_url: 'http://localhost:3000',
  //   },
  //   60
  // )

  // NEWNEWNEW

  const created = Math.floor(Date.now() / 1000)
  const fullPrice = '1000000000' // 1
  const marketFee = '50000000' // 0.05
  const royaltyAmount = '100000000' // 0.10
  Address.parse(nft)
  console.log('b', BN)
  // const x = new BN(royaltyAmount)
  const init = buildNftFixPriceSaleV2StateInit({
    createdAt: created,
    marketplaceAddress: Address.parse(market),
    nftAddress: Address.parse(nft),
    // nftOwnerAddress: Address.parse(owner),
    fullPrice: new BN(fullPrice),
    marketplaceFeeAddress: Address.parse(market),
    marketplaceFee: new BN(marketFee),
    royaltyAddress: Address.parse(collection),
    royaltyAmount: new BN(royaltyAmount),
  })
  const body = new Cell()

  const stateInitCell = new Cell()
  init.stateInit.writeTo(stateInitCell)

  const toSign = new Cell()
  toSign.refs.push(stateInitCell)
  toSign.refs.push(body)

  const seed = '4ac84186cfa6f626afe1f887f77d1b9053dd346babe90720d96b67d7d5345d90'
  const marketKey = TonWeb.utils.nacl.sign.keyPair.fromSeed(Buffer.from(seed, 'hex'))
  // const signature = sign(bodyCell.hash(), params.keyPair.secretKey)
  const signature = nacl.sign.detached(await toSign.hash(), marketKey.secretKey)

  const keeperBody = getGetgemsNFTSaleBody(
    market,
    collection,
    nft,
    owner,
    marketFee,
    royaltyAmount,
    fullPrice,
    created,
    Buffer.from(signature).toString('hex'),
    {
      broadcast: true,
      return_url: 'http://localhost:3000',
      callback_url: 'http://localhost:3000',
    },
    60
  )

  res.json(keeperBody)
  // res.send({ ok: true })
})

const getGetgemsNFTSaleBody = (
  marketplaceAddress: string,
  collectionAddress: string,
  nftAddress: string,
  ownerAddress: string,
  marketFee: string,
  royaltyAmount: string,
  fullPrice: string,
  created: number,
  signature: string,
  responseOptions: TxResponseOptions,
  expiresSec: number
) => ({
  version: '0',
  body: {
    type: 'nft-sale-place-getgems',
    params: {
      marketplaceFeeAddress: marketplaceAddress,
      marketplaceFee: marketFee,
      royaltyAddress: collectionAddress,
      royaltyAmount: royaltyAmount,
      createdAt: created,
      marketplaceAddress: marketplaceAddress,
      nftItemAddress: nftAddress,
      ownerAddress: ownerAddress,
      fullPrice: fullPrice,
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
