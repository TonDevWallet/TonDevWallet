import { useJettonInfo } from '@/hooks/useJettonInfo'
import { Address } from '@ton/core'
import { memo } from 'react'
import { AddressRow } from '@/components/AddressRow'
import { formatUnits } from '@/utils/units'
import { SafeParseAddress } from '@/utils/address'

export const JettonNameDisplay = memo(function JettonNameDisplay({
  jettonAddress,
}: {
  jettonAddress: Address | string | undefined
}) {
  const jettonInfo = useJettonInfo(
    jettonAddress
      ? typeof jettonAddress === 'string' && jettonAddress !== 'TON'
        ? SafeParseAddress(jettonAddress)
        : jettonAddress
      : null
  )

  const name = jettonInfo.jettonInfo?.metadata?.name
  return <div>{<AddressRow address={jettonAddress} text={name} />}</div>
})

export const JettonAmountDisplay = memo(function JettonAmountDisplay({
  amount,
  jettonAddress,
}: {
  amount: bigint
  jettonAddress: Address | string | undefined
}) {
  const jettonInfo = useJettonInfo(
    jettonAddress
      ? typeof jettonAddress === 'string' && jettonAddress !== 'TON'
        ? SafeParseAddress(jettonAddress)
        : jettonAddress
      : null
  )
  const decimals = parseInt(jettonInfo.jettonInfo?.metadata.decimals || '9') || 9
  const symbol = jettonInfo.jettonInfo?.metadata?.symbol || 'UNKWN'
  return (
    <div>
      {formatUnits(amount, decimals)} {symbol}
    </div>
  )
})

export const JettonImage = memo(function JettonImage({
  jettonAddress,
}: {
  jettonAddress: Address | string | undefined
}) {
  const jettonInfo = useJettonInfo(
    jettonAddress
      ? typeof jettonAddress === 'string'
        ? Address.parse(jettonAddress)
        : jettonAddress
      : null
  )

  return (
    <img src={jettonInfo.jettonInfo?.metadata.image} alt={jettonInfo.jettonInfo?.metadata.name} />
  )
})
