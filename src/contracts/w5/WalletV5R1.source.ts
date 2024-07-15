import { Cell } from '@ton/core'

export const WalletV5R1CodeBoc =
  'b5ee9c720101010100230008420220834b7b72b112147e1b2fb457b84e74d1a30f04f737d4f62a668e9552d2b72f'
// 'b5ee9c7201010101002300084202e4cf3b2f4c6d6a61ea0f2b5447d266785b26af3637db2deee6bcd1aa826f3412' beta

export const WalletV5R1CodeCell = Cell.fromBoc(Buffer.from(WalletV5R1CodeBoc, 'hex'))[0]
