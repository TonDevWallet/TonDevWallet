import { BitString, Address, BitReader } from '@ton/core'

export function filterAddressesByShardMask(
  targetAddress: Address,
  shardchainAddresses: Address[]
): Address {
  const targetHash = targetAddress.hash
  const targetBinary = Buffer.from(targetHash)
    .reduce((str, byte) => str + byte.toString(2).padStart(8, '0'), '')
    .slice(0, 4)

  return shardchainAddresses.find((addr) => {
    const addrBinary = Buffer.from(addr.hash)
      .reduce((str, byte) => str + byte.toString(2).padStart(8, '0'), '')
      .slice(0, 4)
    return addrBinary === targetBinary
  })!
}

export function isSameShard(giver: Address, shard: bigint): boolean {
  const shardNum = BigInt.asUintN(64, BigInt(shard))

  let shifts = 0n
  while (((shardNum >> shifts) & 1n) === 0n && shifts < 64n) {
    shifts++
  }
  shifts++

  const accountId = new BitReader(new BitString(giver.hash, 0, 1024)).loadUintBig(64)

  const accountBitMask = accountId >> shifts
  const shardBitMask = shardNum >> shifts

  return accountBitMask === shardBitMask
}

export function getShardBitMask(shard: bigint): string {
  let shifts = 0n
  while (((shard >> shifts) & 1n) === 0n && shifts < 64n) {
    shifts++
  }
  shifts++
  const shardNum = shard >> shifts
  return shardNum.toString(2).padStart(64 - Number(shifts), '0')
}
