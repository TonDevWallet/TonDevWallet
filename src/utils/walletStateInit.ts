import { beginCell, storeStateInit, StateInit } from '@ton/core'
import { IWallet } from '@/types'

/**
 * Returns wallet state init encoded as base64 BOC for a given wallet instance.
 */
export function getStateInitBoc(wallet: IWallet): string {
  let stateInitCell
  switch (wallet.type) {
    case 'highload':
    case 'highload_v2r2':
      stateInitCell = beginCell()
        .store(storeStateInit(wallet.wallet.stateInit as unknown as StateInit))
        .endCell()
      break
    case 'highload_v3':
    case 'v3R1':
    case 'v3R2':
    case 'v4R2':
    case 'multisig_v2_v4r2':
    case 'v5R1':
      stateInitCell = beginCell()
        .store(storeStateInit(wallet.wallet.init as unknown as StateInit))
        .endCell()
      break
    case 'v1R1':
    case 'v2R1':
    case 'v2R2':
    case 'v1R2':
    case 'v1R3':
      stateInitCell = beginCell()
        .store(storeStateInit(wallet.wallet.init as unknown as StateInit))
        .endCell()
      break
    default:
      throw new Error('Unknown wallet type')
  }

  return stateInitCell.toBoc().toString('base64')
}
