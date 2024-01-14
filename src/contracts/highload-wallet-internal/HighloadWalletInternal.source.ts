import { Cell } from '@ton/core'

export const HighloadWalletInternalCodeBoc =
  'te6ccgEBCwEA/wABFP8A9KQT9LzyyAsBAgEgAgMCAUgEBQAG8vABAgLPBgcCASAJCgAjGwxINdJgQJguZMw+ACS8AHigAekgwjXGCDTH9M/+COqH1MgufJj7UTQ0x/TP9P/9ATRU2CAQPQOb6Ex8mBRc7ryogf5AVQQh/kQ8qMC9ATR+AB/jhYhgBD0eG+lIJgC0wfUMAH7AJEy4gGz5luDJaHIQDSAQPRDiuYxAcjLHxPLP8v/9ADJ7VSAIADQggED0lm+lbBIglDBTA7neIJMzNgGSbCHiswAXvZznaiaGmvmOuF/8AEG+X5dqJoaY+Y6Z/p/5j6AmipEEAgegc30JjJLb/JXdHxQ='

export const HighloadWalletInternalCodeCell = Cell.fromBoc(
  Buffer.from(HighloadWalletInternalCodeBoc, 'base64')
)[0]
