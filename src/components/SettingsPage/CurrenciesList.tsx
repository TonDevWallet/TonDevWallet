import { memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { ExtraCurrencyMeta } from '@/types/network'
import CurrencyItem from './CurrencyItem'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCoins } from '@fortawesome/free-solid-svg-icons'

interface CurrenciesListProps {
  networkName: string
  currencies: Record<string, ExtraCurrencyMeta>
  onUpdateMeta: (currencyId: string, field: keyof ExtraCurrencyMeta, value: string | number) => void
  onRemoveCurrency: (currencyId: string) => void
}

const CurrenciesList = memo(
  ({ networkName, currencies, onUpdateMeta, onRemoveCurrency }: CurrenciesListProps) => {
    const currencyEntries = Object.entries(currencies)
    const isEmpty = currencyEntries.length === 0

    return (
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="pt-4 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCoins} className="text-primary" />
            <div>
              <CardTitle className="text-lg">Currencies for {networkName}</CardTitle>
              <CardDescription>Define additional currencies and their properties</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className={`${isEmpty ? 'p-6' : 'p-5'}`}>
          {!isEmpty ? (
            <div className="space-y-1">
              {currencyEntries.map(([currencyId, meta]) => (
                <CurrencyItem
                  key={currencyId}
                  currencyId={currencyId}
                  meta={meta}
                  onUpdateMeta={onUpdateMeta}
                  onRemoveCurrency={onRemoveCurrency}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed border-muted-foreground/20">
              <FontAwesomeIcon icon={faCoins} className="text-3xl text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No currencies configured for this network</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Add a new currency using the form below
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)

CurrenciesList.displayName = 'CurrenciesList'

export default CurrenciesList
