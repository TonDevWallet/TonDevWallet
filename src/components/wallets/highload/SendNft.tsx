export {}

// import { useEffect, useState } from 'react'
// import { ITonHighloadWalletV2 } from '../../../types'
// import Popup from 'reactjs-popup'
// import { BlueButton } from '../../UI'
// import { useLiteclient } from '@/store/liteClient'
// import { Address, Cell } from 'ton'
// import { WalletTransfer } from '@/contracts/HighloadWalletTypes'
// import BN from 'bn.js'
// import { SignExternalMessage } from '@/contracts/SignExternalMessage'

// const { NftItem } = TonWeb.token.nft

// export default function SendNft({
//   wallet,
//   updateBalance,
// }: {
//   wallet: ITonHighloadWalletV2
//   updateBalance: () => void
// }) {
//   const [nft, setNft] = useState('')
//   const [nftRecepient, setNftRecepient] = useState('')
//   const [nftMessage, setNftMessage] = useState('')
//   const liteClient = useLiteclient()

//   useEffect(() => {
//     setNft('')
//     setNftRecepient('')
//     setNftMessage('')
//   }, [wallet, liteClient])

//   return (
//     <div className="flex flex-col mt-4 p-4 border rounded shadow">
//       <div className="font-medium text-lg text-accent my-2">Transfer NFT:</div>

//       <div className="mt-2 flex flex-col">
//         <label htmlFor="nftAddressInput">NFT Address:</label>
//         <input
//           className="border rounded p-2"
//           id="nftAddressInput"
//           type="text"
//           value={nft}
//           onChange={(e: any) => setNft(e.target.value)}
//         />
//       </div>

//       <div className="mt-2 flex flex-col">
//         <label htmlFor="nftToInput">Recepient:</label>
//         <input
//           className="border rounded p-2"
//           id="nftToInput"
//           type="text"
//           value={nftRecepient}
//           onChange={(e: any) => setNftRecepient(e.target.value)}
//         />
//       </div>

//       <div className="mt-2 flex flex-col">
//         <label htmlFor="nftMessageInput">Message:</label>
//         <input
//           className="border rounded p-2"
//           id="nftMessageInput"
//           type="text"
//           value={nftMessage}
//           onChange={(e: any) => setNftMessage(e.target.value)}
//         />
//       </div>

//       <SendNftModal
//         nft={nft}
//         recepient={nftRecepient}
//         wallet={wallet}
//         // seqno={seqno}
//         // provider={provider}
//         nftMessage={nftMessage}
//         updateBalance={updateBalance}
//       />
//     </div>
//   )
// }

// const SendNftModal = ({
//   nft,
//   recepient,
//   wallet,
//   updateBalance,
// }: {
//   nft: string
//   recepient: string
//   wallet: ITonHighloadWalletV2
//   nftMessage: string
//   updateBalance: () => void
// }) => {
//   const [open, setOpen] = useState(false)
//   const close = () => setOpen(false)
//   const liteClient = useLiteclient()

//   const sendMoney = async (close: () => void) => {
//     const nftAddress = new TonWeb.utils.Address(nft)
//     const nftItem = new NftItem(new TonWeb.HttpProvider(), { address: nftAddress })

//     const transferPayload = await nftItem.createTransferBody({
//       newOwnerAddress: new TonWeb.utils.Address(recepient),
//       forwardAmount: TonWeb.utils.toNano(0.02),
//       forwardPayload: undefined,
//       // new TextEncoder().encode(nftMessage),
//       responseAddress: new TonWeb.utils.Address(wallet.address.toString()),
//     })
//     const boc = await transferPayload.toBoc()

//     const cell = Cell.fromBoc(Buffer.from(boc))[0]

//     const params: WalletTransfer = {
//       destination: Address.parse(nftAddress.toString()),
//       amount: new BN(700000000),
//       mode: 3,
//       body: cell,
//     }

//     const message = wallet.wallet.CreateTransferMessage([params])
//     const payload = new Cell()
//     SignExternalMessage(Buffer.from(wallet.key.secretKey), message).writeTo(payload)
//     await liteClient.sendMessage(payload.toBoc())

//     updateBalance()
//     close()
//   }

//   return (
//     <>
//       {!open && (
//         <BlueButton className="mt-2" onClick={() => setOpen(true)}>
//           Send
//         </BlueButton>
//       )}
//       <Popup open={open} modal>
//         <div className="flex flex-col p-4">
//           <div>
//             You will send {nft} NFT to {recepient}.
//           </div>
//           <div className="mt-4">Are you sure?</div>
//           <div className="flex mt-2">
//             <div
//               className="bg-accent rounded px-2 py-2 text-white cursor-pointer"
//               onClick={() => sendMoney(close)}
//             >
//               Yes
//             </div>
//             <div
//               className="bg-accent rounded px-2 py-2 text-white cursor-pointer ml-8"
//               onClick={() => close()}
//             >
//               Cancel
//             </div>
//           </div>
//         </div>
//       </Popup>
//     </>
//   )
// }
