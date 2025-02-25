import { memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { ExtraCurrencyMeta } from '@/types/network'
import CurrencyItem from './CurrencyItem'

interface CurrenciesListProps {
  networkName: string
  currencies: Record<string, ExtraCurrencyMeta>
  onUpdateMeta: (currencyId: string, field: keyof ExtraCurrencyMeta, value: string | number) => void
  onRemoveCurrency: (currencyId: string) => void
}

const CurrenciesList = memo(
  ({ networkName, currencies, onUpdateMeta, onRemoveCurrency }: CurrenciesListProps) => {
    const currencyEntries = Object.entries(currencies)

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Currencies for {networkName}</CardTitle>
          <CardDescription>Define additional currencies and their properties</CardDescription>
        </CardHeader>
        <CardContent>
          {currencyEntries.length > 0 ? (
            currencyEntries.map(([currencyId, meta]) => (
              <CurrencyItem
                key={currencyId}
                currencyId={currencyId}
                meta={meta}
                onUpdateMeta={onUpdateMeta}
                onRemoveCurrency={onRemoveCurrency}
              />
            ))
          ) : (
            <p className="text-muted-foreground text-sm">
              No currencies configured for this network
            </p>
          )}
        </CardContent>
      </Card>
    )
  }
)

CurrenciesList.displayName = 'CurrenciesList'

export default CurrenciesList
