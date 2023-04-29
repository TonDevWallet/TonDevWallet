import type { GasInfo } from './ManagedBlockchain'

const previouslyMaxSafeInteger = 9007199254740991n
export function formatTon(amount: bigint | number | undefined) {
  if (!amount) {
    return 0
  }

  if (typeof amount === 'number') {
    return amount / 10 ** 9
  }

  let mul = 1
  while (amount > previouslyMaxSafeInteger) {
    amount /= 10n
    mul *= 10
  }
  return (Number(amount) / 10 ** 9) * mul
}

export function formatGasInfo(gasInfo: Map<string, GasInfo> | undefined) {
  if (!gasInfo) {
    return
  }
  const resultMap: {
    method: string
    calls: number
    minSelf: number
    minTotal: number
    avgSelf: number
    avgFull: number
    maxSelf: number
    maxTotal: number
  }[] = []
  for (const [key, value] of gasInfo.entries()) {
    const calls = value.calls

    const minSelf = calls.reduce((min, call) => (min > call.gasSelf ? call.gasSelf : min), 99999999)
    const minTotal = calls.reduce(
      (min, call) => (min > call.gasFull ? call.gasFull : min),
      999999999999
    )

    const avgSelf = calls.reduce((total, call) => total + call.gasSelf, 0) / calls.length
    const avgFull = calls.reduce((total, call) => total + call.gasFull, 0) / calls.length

    const maxSelf = calls.reduce((max, call) => (max < call.gasSelf ? call.gasSelf : max), 0)
    const maxTotal = calls.reduce((max, call) => (max < call.gasFull ? call.gasFull : max), 0)

    resultMap.push({
      method: key,
      calls: calls.length,
      minSelf: minSelf / 10 ** 9,
      minTotal: minTotal / 10 ** 9,

      avgSelf: avgSelf / 10 ** 9,
      avgFull: avgFull / 10 ** 9,

      maxSelf: maxSelf / 10 ** 9,
      maxTotal: maxTotal / 10 ** 9,
    })
  }
  console.table(resultMap)
}
