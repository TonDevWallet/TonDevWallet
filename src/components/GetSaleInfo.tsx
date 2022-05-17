import { useState } from 'react'
import TonWeb from 'tonweb'
import { HttpProvider } from 'tonweb/dist/types/providers/http-provider'

const { NftSale } = TonWeb.token.nft

export default function GetSaleInfo({ provider }: { provider: HttpProvider }) {
  const [marketAddress, setMarketAddress] = useState('')
  const [nftAddress, setNftAddress] = useState('')
  const [collectionAddress, setCollectionAddress] = useState('')

  const getInfo = async () => {
    console.log('getInfo')
    const sale = new NftSale(provider, {
      marketplaceAddress: new TonWeb.utils.Address(marketAddress),
      nftAddress: new TonWeb.utils.Address(nftAddress),
      fullPrice: TonWeb.utils.toNano('1.1'),
      marketplaceFee: TonWeb.utils.toNano('0.2'),
      royaltyAddress: new TonWeb.utils.Address(collectionAddress),
      royaltyAmount: TonWeb.utils.toNano('0.1'),
    })

    const data = await sale.methods.getData()

    const logData = { ...data } as any
    logData.marketplaceAddress = data.marketplaceAddress?.toString(true, true, true)
    logData.nftAddress = data.nftAddress?.toString(true, true, true)
    logData.nftOwnerAddress = data.nftOwnerAddress?.toString(true, true, true)
    logData.fullPrice = data.fullPrice.toString()
    logData.marketplaceFee = data.marketplaceFee.toString()
    logData.royaltyAmount = data.royaltyAmount.toString()
    logData.royaltyAddress = data.royaltyAddress?.toString(true, true, true)
    console.log(logData)
  }

  return (
    <div>
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

      <button onClick={() => getInfo()}>Get info</button>
    </div>
  )
}
