import React, { memo, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'

interface AddCurrencyFormProps {
  onAddCurrency: (currencyId: string) => Promise<boolean>
}

const AddCurrencyForm = memo(({ onAddCurrency }: AddCurrencyFormProps) => {
  const [currencyId, setCurrencyId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!currencyId.trim()) {
      setError('Please enter a currency ID')
      return
    }

    setIsSubmitting(true)

    try {
      const success = await onAddCurrency(currencyId)

      if (success) {
        setCurrencyId('')
      } else {
        setError('A currency with this ID already exists')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
        <div className="flex-1">
          <Label htmlFor="new-currency-id" className="text-sm font-medium">
            Currency ID
          </Label>
          <div className="mt-1 relative">
            <Input
              id="new-currency-id"
              value={currencyId}
              onChange={(e) => setCurrencyId(e.target.value)}
              placeholder="Enter currency ID (e.g. USDT)"
              aria-invalid={error ? 'true' : 'false'}
              className={`w-full ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              disabled={isSubmitting}
            />
            {error && <p className="text-sm text-red-500 mt-1 absolute">{error}</p>}
          </div>
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full md:w-auto transition-all" disabled={isSubmitting}>
            <FontAwesomeIcon
              icon={faPlus}
              className={`mr-2 ${isSubmitting ? 'animate-spin' : ''}`}
            />
            {isSubmitting ? 'Adding...' : 'Add Currency'}
          </Button>
        </div>
      </div>
    </form>
  )
})

AddCurrencyForm.displayName = 'AddCurrencyForm'

export default AddCurrencyForm
