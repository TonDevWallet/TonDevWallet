import React, { memo, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { ExtraCurrencyMeta } from '@/types/network'

interface CurrencyItemProps {
  currencyId: string
  meta: ExtraCurrencyMeta
  onUpdateMeta: (currencyId: string, field: keyof ExtraCurrencyMeta, value: string | number) => void
  onRemoveCurrency: (currencyId: string) => void
}

const CurrencyItem = memo(
  ({ currencyId, meta, onUpdateMeta, onRemoveCurrency }: CurrencyItemProps) => {
    const [symbol, setSymbol] = useState(meta.symbol)
    const [decimals, setDecimals] = useState(meta.decimals)

    const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setSymbol(newValue)
      onUpdateMeta(currencyId, 'symbol', newValue)
    }

    const handleDecimalsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value)
      setDecimals(newValue)
      onUpdateMeta(currencyId, 'decimals', newValue)
    }

    return (
      <div className="flex flex-col gap-2 pb-4 mb-4 border-b">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">{currencyId}</h4>
          <Button variant="ghost" size="icon" onClick={() => onRemoveCurrency(currencyId)}>
            <FontAwesomeIcon icon={faTrash} size="xs" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${currencyId}-symbol`}>Symbol</Label>
            <Input
              id={`${currencyId}-symbol`}
              value={symbol}
              onChange={handleSymbolChange}
              placeholder="e.g. USDT"
            />
          </div>
          <div>
            <Label htmlFor={`${currencyId}-decimals`}>Decimals</Label>
            <Input
              id={`${currencyId}-decimals`}
              type="number"
              value={decimals}
              onChange={handleDecimalsChange}
              placeholder="9"
            />
          </div>
        </div>
      </div>
    )
  }
)

CurrencyItem.displayName = 'CurrencyItem'

export default CurrencyItem
