import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faPlus } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function WalletEmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FontAwesomeIcon icon={hasQuery ? faMagnifyingGlass : faPlus} />
        </div>
        <div>
          <h3 className="font-semibold">{hasQuery ? 'No matching wallets' : 'No wallets yet'}</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {hasQuery
              ? 'Try another name, address, wallet version, workchain, or key source.'
              : 'Create or import a key source, then manage all derived TON wallet contracts here.'}
          </p>
        </div>
        {!hasQuery && (
          <Button asChild>
            <Link to="/app/new_wallet">
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              New wallet
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
