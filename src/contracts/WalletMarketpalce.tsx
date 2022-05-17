import TonWeb from 'tonweb'
import { HttpProvider } from 'tonweb/dist/types/providers/http-provider'
import nacl from 'tweetnacl'
import { WalletContract } from './WalletContract'

const Cell = TonWeb.boc.Cell
const Contract = TonWeb.Contract
const { Address, bytesToHex, BN } = TonWeb.utils
const { NftSale } = TonWeb.token.nft

// const { Cell } = require('../../boc')
// const { WalletContract } = require('./WalletContract')
//

class WalletMarketplace extends WalletContract {
  constructor(provider: any, options: any) {
    options.code = Cell.oneFromBoc(
      'B5EE9C7241010C0100EF000114FF00F4A413F4BCF2C80B01020120020302014804050078F28308D71820D31FD31FD31F02F823BBF263F0015132BAF2A15144BAF2A204F901541055F910F2A3F8009320D74A96D307D402FB00E83001A402F0020202CE06070201480A0B02012008090017402C8CB1FCB1FCBFFC9ED54800A91B088831C02456F8007434C0CC1C6C244C383C005B084074C7C07000638D20C235C6083E405000FE443CA8F5350C087E401C323281F2FFF2741DDD20063232C172C09633C59C3E80B2DAC4B3333260103EC03816E000153B513434C7F4C7F4FFCC200017BB39CED44D0D33F31D70BFF80011B8C97ED44D0D70B1F82E9EF23C'
    )
    super(provider, options)
    if (!this.options.walletId) this.options.walletId = 698983191 + this.options.wc
  }

  getName() {
    return 'WalletMarketplace'
  }

  /**
   * @override
   * @private
   * @return {Cell} cell contains nft marketplace data
   */
  /*
  Marketplace data cell
  createDataCell() {
    const cell = new Cell()
    cell.bits.writeAddress(this.options.ownerAddress)
    return cell
  }
   */

  /**
   * @override
   * @private
   * @param   seqno?   {number}
   * @return {Cell}
   */
  createSigningMessage(seqno?: number) {
    seqno = seqno || 0
    const message = new Cell()
    message.bits.writeUint(this.options.walletId, 32)
    if (seqno === 0) {
      // message.bits.writeInt(-1, 32);// todo: dont work
      for (let i = 0; i < 32; i++) {
        message.bits.writeBit(1)
      }
    } else {
      const date = new Date()
      const timestamp = Math.floor(date.getTime() / 1e3)
      message.bits.writeUint(timestamp + 60, 32)
    }
    message.bits.writeUint(seqno, 32)
    return message
  }

  /**
   * @override
   * @return {Cell} cell contains wallet data
   */
  createDataCell() {
    const cell = new Cell()
    cell.bits.writeUint(0, 32)
    cell.bits.writeUint(this.options.walletId, 32)
    cell.bits.writeBytes(this.options.publicKey)
    return cell
  }

  async createSale(
    provider: HttpProvider,
    nftAddress: any,
    fullPrice = '1.1',
    marketplaceFee = '0.2',
    royaltyAmount = '0.1',
    collectionAddress: string,
    secretKey: any
  ) {
    const selfAddress = await this.getAddress()

    const amount = TonWeb.utils.toNano(0.05)

    const sale = new NftSale(provider, {
      marketplaceAddress: selfAddress,
      nftAddress: new TonWeb.utils.Address(nftAddress),

      fullPrice: TonWeb.utils.toNano(fullPrice),
      marketplaceFee: TonWeb.utils.toNano(marketplaceFee),
      royaltyAddress: new TonWeb.utils.Address(collectionAddress),
      royaltyAmount: TonWeb.utils.toNano(royaltyAmount),
    })

    const body = new TonWeb.boc.Cell()
    body.bits.writeUint(1, 32) // OP deploy new auction
    body.bits.writeCoins(amount)
    body.refs.push((await sale.createStateInit()).stateInit)
    body.refs.push(new TonWeb.boc.Cell())

    const result = {
      secretKey: secretKey,
      toAddress: selfAddress,
      amount: amount,
      payload: body,
      sendMode: 3,
    }

    return result
  }
}

export { WalletMarketplace }
// module.exports = { WalletV3ContractR1, WalletV3ContractR2 }
