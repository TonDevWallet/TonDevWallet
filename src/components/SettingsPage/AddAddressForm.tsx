import { useState, useCallback, FormEvent, useEffect } from 'react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { useToast } from '../ui/use-toast'
import { formatTonAddress } from '@/hooks/useAddressBook'

interface AddAddressFormProps {
  onAddAddress: (address: string, title: string, description: string) => Promise<number>
}

const AddAddressForm = ({ onAddAddress }: AddAddressFormProps) => {
  const { toast } = useToast()
  const [address, setAddress] = useState('')
  const [formattedAddress, setFormattedAddress] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Format the address whenever it changes
  useEffect(() => {
    if (!address.trim()) {
      setFormattedAddress('')
      return
    }

    try {
      // Only format after user stops typing
      const timeoutId = setTimeout(() => {
        setFormattedAddress(formatTonAddress(address))
      }, 500)

      return () => clearTimeout(timeoutId)
    } catch (error) {
      console.error('Error formatting address:', error)
    }
  }, [address])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()

      if (!address.trim()) {
        toast({
          title: 'Address is required',
          description: 'Please enter a valid TON address',
          variant: 'destructive',
        })
        return
      }

      setIsSubmitting(true)

      try {
        // Use the formatted address for submission
        const finalAddress = formattedAddress || formatTonAddress(address)
        const addressBookId = await onAddAddress(finalAddress, title, description)

        if (addressBookId) {
          toast({
            title: 'Address saved',
            description: 'The address has been added to your address book',
          })

          // Reset form
          setAddress('')
          setFormattedAddress('')
          setTitle('')
          setDescription('')
        } else {
          toast({
            title: 'Failed to save address',
            description: 'An error occurred while saving the address',
            variant: 'destructive',
          })
        }
      } catch (error) {
        toast({
          title: 'Failed to save address',
          description: error instanceof Error ? error.message : 'An unknown error occurred',
          variant: 'destructive',
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [address, formattedAddress, title, description, onAddAddress, toast]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Input
          id="address"
          placeholder="Enter TON address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
        {formattedAddress && address !== formattedAddress && (
          <p className="text-sm text-muted-foreground">
            Will be saved as: <span className="font-mono">{formattedAddress}</span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="E.g. My Wallet, Exchange, etc."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Optional notes about this address"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <Button type="submit" disabled={isSubmitting || !address.trim()}>
        {isSubmitting ? 'Saving...' : 'Save Address'}
      </Button>
    </form>
  )
}

export default AddAddressForm
