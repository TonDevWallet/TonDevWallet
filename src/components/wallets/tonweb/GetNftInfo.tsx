import { useState } from 'react'
import TonWeb from 'tonweb'
import { HttpProvider } from 'tonweb/dist/types/providers/http-provider'

const { NftItem } = TonWeb.token.nft

export default function GetNftInfo() {
  const [info, setInfo] = useState('')
  const [nftAddress, setNftAddress] = useState('')

  const getInfo = async () => {
    console.log('getInfo')
    const nft = new NftItem(new TonWeb.HttpProvider(), { address: nftAddress })

    const info = await nft.getData()
    const data: any = { ...info }
    data.ownerAddress = info.ownerAddress?.toFriendly({ bounceable: true, urlSafe: true })
    data.collectionAddress = info.collectionAddress.toFriendly({ bounceable: true, urlSafe: true })

    setInfo(JSON.stringify(data, null, 2))
  }

  return (
    <div className="p-4 border rounded shadow">
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

      <button onClick={() => getInfo()}>Get info</button>

      <div>{info}</div>
    </div>
  )
}
