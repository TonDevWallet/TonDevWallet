import { useMemo } from 'react'
import { KeyPair } from '@ton/crypto'
import { secretKeyToED25519 } from '@/utils/ed25519'

export function useSeed(seed?: string | Buffer): KeyPair | undefined {
  return useMemo(
    () =>
      seed
        ? typeof seed === 'string'
          ? secretKeyToED25519(Buffer.from(seed, 'hex'))
          : secretKeyToED25519(seed)
        : undefined,
    [seed]
  )
}
