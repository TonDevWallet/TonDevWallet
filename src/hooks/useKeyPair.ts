import { useMemo } from 'react'
import { KeyPair, keyPairFromSeed } from '@ton/crypto'

export function useSeed(seed?: string | Buffer): KeyPair | undefined {
  return useMemo(
    () =>
      seed
        ? typeof seed === 'string'
          ? keyPairFromSeed(Buffer.from(seed, 'hex'))
          : keyPairFromSeed(seed)
        : undefined,
    [seed]
  )
}
