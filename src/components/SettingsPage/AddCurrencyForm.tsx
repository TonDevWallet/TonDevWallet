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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!currencyId.trim()) {
      setError('Please enter a currency ID')
      return
    }

    const success = await onAddCurrency(currencyId)

    if (success) {
      setCurrencyId('')
    } else {
      setError('A currency with this ID already exists')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-4 mb-4">
      <div className="flex-1">
        <Label htmlFor="new-currency-id">Currency ID</Label>
        <Input
          id="new-currency-id"
          value={currencyId}
          onChange={(e) => setCurrencyId(e.target.value)}
          placeholder="Enter currency ID (e.g. USDT)"
          aria-invalid={error ? 'true' : 'false'}
        />
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
      <div className="pt-6">
        <Button type="submit">
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Add Currency
        </Button>
      </div>
    </form>
  )
})

AddCurrencyForm.displayName = 'AddCurrencyForm'

export default AddCurrencyForm
