import { Address, Cell, contractAddress, StateInit } from 'ton'
import BN from 'bn.js'
// import { NftFixPriceSaleV2CodeCell } from './NftFixpriceSaleV2.source'
const src = Buffer.from(
  'te6cckECDAEAAikAART/APSkE/S88sgLAQIBIAMCAATyMAIBSAUEAFGgOFnaiaGmAaY/9IH0gfSB9AGoYaH0gfQB9IH0AGEEIIySsKAVgAKrAQICzQgGAfdmCEDuaygBSYKBSML7y4cIk0PpA+gD6QPoAMFOSoSGhUIehFqBSkHCAEMjLBVADzxYB+gLLaslx+wAlwgAl10nCArCOF1BFcIAQyMsFUAPPFgH6AstqyXH7ABAjkjQ04lpwgBDIywVQA88WAfoCy2rJcfsAcCCCEF/MPRSBwCCIYAYyMsFKs8WIfoCy2rLHxPLPyPPFlADzxbKACH6AsoAyYMG+wBxVVAGyMsAFcsfUAPPFgHPFgHPFgH6AszJ7VQC99AOhpgYC42EkvgnB9IBh2omhpgGmP/SB9IH0gfQBqGBNgAPloyhFrpOEBWccgGRwcKaDjgskvhHAoomOC+XD6AmmPwQgCicbIiV15cPrpn5j9IBggKwNkZYAK5Y+oAeeLAOeLAOeLAP0BZmT2qnAbE+OAcYED6Y/pn5gQwLCQFKwAGSXwvgIcACnzEQSRA4R2AQJRAkECPwBeA6wAPjAl8JhA/y8AoAyoIQO5rKABi+8uHJU0bHBVFSxwUVsfLhynAgghBfzD0UIYAQyMsFKM8WIfoCy2rLHxnLPyfPFifPFhjKACf6AhfKAMmAQPsAcQZQREUVBsjLABXLH1ADzxYBzxYBzxYB+gLMye1UABY3EDhHZRRDMHDwBTThaBI=',
  'base64'
)
const NftFixPriceSaleV2CodeCell = Cell.fromBoc(src)[0]

export type NftFixPriceSaleV2Data = {
  isComplete: boolean
  createdAt: number
  marketplaceAddress: Address
  nftAddress: Address
  nftOwnerAddress: Address | null
  fullPrice: BN
  marketplaceFeeAddress: Address
  marketplaceFee: BN
  royaltyAddress: Address
  royaltyAmount: BN
}

export function buildNftFixPriceSaleV2DataCell(data: NftFixPriceSaleV2Data) {
  const feesCell = new Cell()

  feesCell.bits.writeAddress(data.marketplaceFeeAddress)
  feesCell.bits.writeCoins(data.marketplaceFee)
  feesCell.bits.writeAddress(data.royaltyAddress)
  feesCell.bits.writeCoins(data.royaltyAmount)

  const dataCell = new Cell()

  dataCell.bits.writeUint(data.isComplete ? 1 : 0, 1)
  dataCell.bits.writeUint(data.createdAt, 32)
  dataCell.bits.writeAddress(data.marketplaceAddress)
  dataCell.bits.writeAddress(data.nftAddress)
  dataCell.bits.writeAddress(data.nftOwnerAddress)
  dataCell.bits.writeCoins(data.fullPrice)
  dataCell.refs.push(feesCell)

  return dataCell
}

export function buildNftFixPriceSaleV2StateInit(
  data: Omit<NftFixPriceSaleV2Data, 'nftOwnerAddress' | 'isComplete'>
) {
  const dataCell = buildNftFixPriceSaleV2DataCell({
    ...data,
    // Nft owner address would be set by NFT itself by ownership_assigned callback
    nftOwnerAddress: null,
    isComplete: false,
  })

  const stateInit = new StateInit({
    code: NftFixPriceSaleV2CodeCell,
    data: dataCell,
  })
  const address = contractAddress({
    workchain: 0,
    initialCode: NftFixPriceSaleV2CodeCell,
    initialData: dataCell,
  })

  return {
    address,
    stateInit,
  }
}

export const OperationCodes = {
  AcceptCoins: 1,
  Buy: 2,
  CancelSale: 3,
}

export const Queries = {
  cancelSale: (params: { queryId?: number }) => {
    const msgBody = new Cell()
    msgBody.bits.writeUint(OperationCodes.CancelSale, 32)
    msgBody.bits.writeUint(params.queryId ?? 0, 64)
    return msgBody
  },
}
