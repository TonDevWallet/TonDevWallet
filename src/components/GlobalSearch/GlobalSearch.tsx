import { Input } from '../ui/input'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import { setSearchQuery, clearSearchQuery, useSearchQuery } from '@/store/searchState'
import { Button } from '../ui/button'

type GlobalSearchProps = {
  placeholder?: string
  className?: string
}

export function GlobalSearch({
  placeholder = 'Search by address, name or type...',
  className = '',
}: GlobalSearchProps) {
  const searchQuery = useSearchQuery()

  return (
    <div className={`relative ${className}`}>
      <Input
        type="text"
        placeholder={placeholder}
        value={searchQuery.get()}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pr-20"
      />
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
        {searchQuery && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={clearSearchQuery}>
            <FontAwesomeIcon icon={faTimes} className="text-muted-foreground" />
          </Button>
        )}
        <FontAwesomeIcon icon={faSearch} className="text-muted-foreground mr-1" />
      </div>
    </div>
  )
}
