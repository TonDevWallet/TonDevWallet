import React, { memo, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCoins, faHashtag, faTrash } from '@fortawesome/free-solid-svg-icons'
import { ExtraCurrencyMeta } from '@/types/network'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { Badge } from '../ui/badge'
import { cn } from '@/utils/cn'

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
      <div className="bg-card/50 rounded-lg border-2 border-border/50 hover:border-primary/20 transition-all mb-4 p-4 group">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <div className="bg-primary/10 rounded-full p-2 mr-3">
              <FontAwesomeIcon icon={faCoins} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-lg">{currencyId}</h4>
                <Badge variant="outline" className="text-xs">
                  ID: {currencyId}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure display settings for this currency
              </p>
            </div>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveCurrency(currencyId)}
                  className="opacity-50 hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30 transition-all"
                >
                  <FontAwesomeIcon icon={faTrash} size="sm" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove currency</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label
              htmlFor={`${currencyId}-symbol`}
              className="text-sm font-medium flex items-center gap-1.5"
            >
              <FontAwesomeIcon icon={faCoins} className="text-xs text-muted-foreground" />
              Symbol
            </Label>
            <Input
              id={`${currencyId}-symbol`}
              value={symbol}
              onChange={handleSymbolChange}
              placeholder="e.g. USDT"
              className={cn(
                'transition-all',
                !symbol.trim() && 'border-yellow-300 focus-visible:ring-yellow-500'
              )}
            />
            {!symbol.trim() && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Setting a symbol is recommended
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor={`${currencyId}-decimals`}
              className="text-sm font-medium flex items-center gap-1.5"
            >
              <FontAwesomeIcon icon={faHashtag} className="text-xs text-muted-foreground" />
              Decimals
            </Label>
            <Input
              id={`${currencyId}-decimals`}
              type="number"
              value={decimals}
              onChange={handleDecimalsChange}
              placeholder="9"
              min="0"
              max="18"
              className="transition-all"
            />
            <p className="text-xs text-muted-foreground">
              Number of decimal places (typically 9 for TON)
            </p>
          </div>
        </div>
      </div>
    )
  }
)

CurrencyItem.displayName = 'CurrencyItem'

export default CurrencyItem
