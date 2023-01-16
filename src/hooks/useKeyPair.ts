import { useMemo } from 'react'
import { KeyPair, keyPairFromSeed } from 'ton-crypto'

export function useKeyPair(seed?: string): KeyPair | undefined {
  return useMemo(() => (seed ? keyPairFromSeed(Buffer.from(seed, 'hex')) : undefined), [seed])
}
