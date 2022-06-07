import { useMemo, useState } from 'react'
import QRCode from 'react-qr-code'
import Popup from 'reactjs-popup'
import TonWeb from 'tonweb'
import { HttpProvider } from 'tonweb/dist/types/providers/http-provider'
import nacl from 'tweetnacl'
// import nacl from 'tweetnacl'
import { ITonWebWallet } from '../../../types'
import { TxResponseOptions } from '../../../types/TxRequest'
import { BlueButton } from '../../UI'
import BN from 'bn.js'

import { Cell as TonCell, Address as TonAddress } from 'ton'
import { buildNftFixPriceSaleV2StateInit } from '../../../contracts/NftFixpriceSaleV2.data'

// const { NftSale } = TonWeb.token.nft
const { Cell } = TonWeb.boc

const getRequestUrl = (req: any) => {
  return `https://app.tonkeeper.com/v1/txrequest-inline/${Buffer.from(req).toString('base64')}`
}

export default function CreateNftSale({
  seqno,
  wallet,

  updateBalance,
}: {
  seqno: string
  wallet: ITonWebWallet
  provider: HttpProvider
  updateBalance: () => void
}) {
  const [marketAddress, setMarketAddress] = useState('')
  const [nftAddress, setNftAddress] = useState('')
  const [collectionAddress, setCollectionAddress] = useState('')

  // const [signature, setSignature] = useState('')
  // useEffect(() => {
  //   ;(async function () {
  //     // const sale = new NftSale(provider, {
  //     //   marketplaceAddress: new TonWeb.utils.Address(marketAddress),
  //     //   nftAddress: new TonWeb.utils.Address(nftAddress),
  //     //   fullPrice: TonWeb.utils.toNano('1.1'),
  //     //   marketplaceFee: TonWeb.utils.toNano('0.2'),
  //     //   royaltyAddress: new TonWeb.utils.Address(collectionAddress),
  //     //   royaltyAmount: TonWeb.utils.toNano('0.1'),
  //     // })

  //     // const saleStateInit = (await sale.createStateInit()).stateInit
  //     // const saleMessageBody = new TonWeb.boc.Cell()

  //     // const bodyCell = new Cell()
  //     // bodyCell.refs.push(saleStateInit)
  //     // bodyCell.refs.push(saleMessageBody)

  //     // // const signature = sign(bodyCell.hash(), params.keyPair.secretKey)
  //     // const signature = nacl.sign.detached(await bodyCell.hash(), wallet.key.secretKey)

  //     // const msgBody = new Cell()
  //     // msgBody.bits.writeUint(1, 32)
  //     // msgBody.bits.writeBytes(signature)
  //     // msgBody.refs.push(saleStateInit)
  //     // msgBody.refs.push(saleMessageBody)

  //     // const boc = await msgBody.toBoc()
  //     // setSignature(Buffer.from(boc).toString('hex'))
  //     setSignature(Buffer.from(signature).toString('hex'))
  //   })()
  // }, [marketAddress, collectionAddress, nftAddress])

  // const signature = useMemo(() => {

  // })

  const qrText = useMemo(() => {
    if (!marketAddress || !collectionAddress || !nftAddress) {
      return ''
    }

    const created = Math.floor(Date.now() / 1000)
    const fullPrice = '1000000000' // 1
    const marketFee = '50000000' // 0.05
    const royaltyAmount = '100000000' // 0.10

    const init = buildNftFixPriceSaleV2StateInit({
      createdAt: created,
      marketplaceAddress: TonAddress.parse(marketAddress),
      nftAddress: TonAddress.parse(nftAddress),
      // nftOwnerAddress: Address.parse(owner),
      fullPrice: new BN(fullPrice),
      marketplaceFeeAddress: TonAddress.parse(marketAddress),
      marketplaceFee: new BN(marketFee),
      royaltyAddress: TonAddress.parse(collectionAddress),
      royaltyAmount: new BN(royaltyAmount),
    })

    const stateInitCell = new TonCell()
    init.stateInit.writeTo(stateInitCell)

    const saleStateInit = stateInitCell
    const saleMessageBody = new TonCell()

    const bodyCell = new TonCell()
    bodyCell.refs.push(saleStateInit)
    bodyCell.refs.push(saleMessageBody)

    // const signature = sign(bodyCell.hash(), params.keyPair.secretKey)
    const signature = nacl.sign.detached(bodyCell.hash(), wallet.key.secretKey)

    const body = getGetgemsNFTSaleBody(
      marketAddress,
      collectionAddress,
      nftAddress,
      wallet.address.toString(true, true, true),
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

    const url = getRequestUrl(JSON.stringify(body))

    console.log('body', body, url)
    return url
    // return `https://app.tonkeeper.com/v1/txrequest-url/trcr.loca.lt/api/sale/${marketAddress}/${collectionAddress}/${nftAddress}/${wallet.address.toString(
    //   true,
    //   true,
    //   true
    // )}`
  }, [marketAddress, collectionAddress, nftAddress])

  return (
    <div className="p-4 border rounded shadow">
      <div>Nft Sale</div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="nftToInput">Market address:</label>
        <input
          className="border rounded p-2"
          id="nftToInput"
          type="text"
          value={marketAddress}
          onChange={(e: any) => setMarketAddress(e.target.value)}
        />
      </div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="nftToInput">Nft address:</label>
        <input
          className="border rounded p-2"
          id="nftToInput"
          type="text"
          value={nftAddress}
          onChange={(e: any) => setNftAddress(e.target.value)}
        />
      </div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="nftToInput">Collection address:</label>
        <input
          className="border rounded p-2"
          id="nftToInput"
          type="text"
          value={collectionAddress}
          onChange={(e: any) => setCollectionAddress(e.target.value)}
        />
      </div>

      <div>
        <div>QR:</div>
        <a href={qrText}>{qrText}</a>
        <div>
          <QRCode level="L" value={qrText} size={256} />
        </div>
      </div>

      {/* <div>Address: {marketAddress}</div> */}
      <CreateSaleModal
        marketAddress={marketAddress}
        nftAddress={nftAddress}
        collectionAddress={collectionAddress}
        wallet={wallet}
        seqno={seqno}
        // provider={provider}
        updateBalance={updateBalance}
      />
    </div>
  )
}

const CreateSaleModal = ({
  marketAddress,
  nftAddress,
  collectionAddress,
  wallet,
  seqno,
  // provider,
  updateBalance,
}: {
  marketAddress: string
  nftAddress: string
  collectionAddress: string
  wallet: ITonWebWallet
  seqno: string
  // provider: HttpProvider
  updateBalance: () => void
}) => {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const sendMoney = async (close: () => void) => {
    const amount = TonWeb.utils.toNano(0.05)

    // const sale = new NftSale(provider, {
    //   marketplaceAddress: new TonWeb.utils.Address(marketAddress),
    //   nftAddress: new TonWeb.utils.Address(nftAddress),
    //   fullPrice: TonWeb.utils.toNano('1.1'),
    //   marketplaceFee: TonWeb.utils.toNano('0.2'),
    //   royaltyAddress: new TonWeb.utils.Address(collectionAddress),
    //   royaltyAmount: TonWeb.utils.toNano('0.1'),
    // })
    const created = Math.floor(Date.now() / 1000)
    const fullPrice = '1000000000' // 1
    const marketFee = '50000000' // 0.05
    const royaltyAmount = '100000000' // 0.10

    const init = buildNftFixPriceSaleV2StateInit({
      createdAt: created,
      marketplaceAddress: TonAddress.parse(marketAddress),
      nftAddress: TonAddress.parse(nftAddress),
      // nftOwnerAddress: Address.parse(owner),
      fullPrice: new BN(fullPrice),
      marketplaceFeeAddress: TonAddress.parse(marketAddress),
      marketplaceFee: new BN(marketFee),
      royaltyAddress: TonAddress.parse(collectionAddress),
      royaltyAmount: new BN(royaltyAmount),
    })

    const stateInitCell = new TonCell()
    init.stateInit.writeTo(stateInitCell)

    const saleStateInit = stateInitCell
    const saleMessageBody = new TonCell()

    const bodyCell = new TonCell()
    bodyCell.refs.push(saleStateInit)
    bodyCell.refs.push(saleMessageBody)

    // const signature = sign(bodyCell.hash(), params.keyPair.secretKey)
    const signature = nacl.sign.detached(await bodyCell.hash(), wallet.key.secretKey)

    const msgBody = new TonCell()
    msgBody.bits.writeUint(1, 32)
    msgBody.bits.writeBuffer(Buffer.from(signature))
    msgBody.refs.push(saleStateInit)
    msgBody.refs.push(saleMessageBody)
    const boc = msgBody.toBoc()
    const hex = Buffer.from(boc).toString('hex')
    console.log('toncell boc', boc, hex)

    const cell = await Cell.oneFromBoc(hex)
    console.log('tonweb boc', await cell.toBoc())

    await wallet.wallet.methods
      .transfer({
        secretKey: wallet.key.secretKey,
        toAddress: new TonWeb.utils.Address(marketAddress),
        amount: amount,
        seqno: parseInt(seqno),
        payload: cell,
        sendMode: 3,
      })
      .send()

    updateBalance()
    close()
  }

  return (
    <>
      {!open && (
        <BlueButton className="mt-2" onClick={() => setOpen(true)}>
          Send
        </BlueButton>
      )}

      <Popup open={open} modal>
        <div className="flex flex-col p-4">
          <div>You will create marketplace.</div>
          <div className="mt-4">Are you sure?</div>
          <div className="flex mt-2">
            <div
              className="bg-highlight rounded px-2 py-2 text-white cursor-pointer"
              onClick={() => sendMoney(close)}
            >
              Yes
            </div>
            <div
              className="bg-highlight rounded px-2 py-2 text-white cursor-pointer ml-8"
              onClick={() => close()}
            >
              Cancel
            </div>
          </div>
        </div>
      </Popup>
    </>
  )
}

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
      forwardAmount: '20000000',
      transferAmount: '30000000',
      deployAmount: '30000000',
    },
    response_options: responseOptions,
    expires_sec: expiresSec,
  },
})
