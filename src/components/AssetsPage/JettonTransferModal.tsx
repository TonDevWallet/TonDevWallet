import { useState } from 'react'
import { Address } from '@ton/core'
import { IWallet } from '@/types'
import { Key } from '@/types/Key'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatUnits, parseUnits } from '@/utils/units'
import { addConnectMessage } from '@/store/connectMessages'
import { useNavigate } from 'react-router-dom'
import { textToWalletBody } from '@/utils/textToWalletBody'

interface JettonBalance {
  balance: string
  jetton: {
    address: string
    name: string
    symbol: string
    decimals: number
    image?: string
  }
}

interface JettonTransferModalProps {
  jetton: JettonBalance
  wallet: IWallet | null
  selectedKey: Key | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransferComplete: () => void
}

export function JettonTransferModal({
  jetton,
  wallet,
  selectedKey,
  open,
  onOpenChange,
  onTransferComplete,
}: JettonTransferModalProps) {
  const navigate = useNavigate()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const maxBalance = formatUnits(BigInt(jetton.balance), jetton.jetton.decimals)

  const handleMaxClick = () => {
    setAmount(maxBalance)
  }

  const handleTransfer = async () => {
    if (!wallet || !selectedKey || !recipient || !amount) {
      return
    }

    try {
      setIsLoading(true)

      // Validate recipient address
      Address.parse(recipient)

      // Parse amount to smallest units
      const transferAmount = parseUnits(amount, jetton.jetton.decimals)

      // Check if amount exceeds balance
      if (transferAmount > BigInt(jetton.balance)) {
        alert('Amount exceeds available balance')
        return
      }

      // Create jetton transfer payload
      // This follows the standard jetton transfer format
      const jettonTransferPayload = {
        queryId: 0n,
        amount: transferAmount,
        destination: Address.parse(recipient),
        responseDestination: wallet.address,
        customPayload: null,
        forwardTonAmount: parseUnits('0.05', 9), // Standard forward amount for jetton transfers
        forwardPayload: null,
      }

      // For now, we'll create a simple transfer message
      // In production, this should use proper jetton transfer encoding
      const payloadCell = textToWalletBody(JSON.stringify(jettonTransferPayload), false)

      // Add to connect messages for processing
      await addConnectMessage({
        message_type: 'tx',
        connect_event_id: 0,
        connect_session_id: 0,
        key_id: selectedKey.id,
        wallet_id: wallet.id,
        status: 0,
        payload: {
          messages: [
            {
              address: jetton.jetton.address, // Send to jetton contract
              amount: parseUnits('0.1', 9).toString(), // TON amount for gas
              payload: payloadCell?.toBoc().toString('base64'),
              stateInit: undefined,
            },
          ],
          valid_until: Date.now() + 5 * 60 * 1000, // 5 minutes from now
        },
        wallet_address: wallet.address.toRawString(),
        message_mode: 3, // Pay fees separately + ignore errors
      })

      onTransferComplete()
      navigate('/app') // Navigate to home to see the pending transaction
    } catch (error) {
      console.error('Transfer failed:', error)
      alert('Transfer failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  const isValidRecipient = () => {
    try {
      if (!recipient) return false
      Address.parse(recipient)
      return true
    } catch {
      return false
    }
  }

  const isValidAmount = () => {
    try {
      const amountFloat = parseFloat(amount)
      return amountFloat > 0 && amountFloat <= parseFloat(maxBalance)
    } catch {
      return false
    }
  }

  const canTransfer = isValidRecipient() && isValidAmount() && !isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Jetton</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Jetton Info */}
          <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={jetton.jetton.image} alt={jetton.jetton.name} />
              <AvatarFallback>{jetton.jetton.symbol.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{jetton.jetton.name}</h3>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{jetton.jetton.symbol}</Badge>
                <span className="text-sm text-muted-foreground">
                  Balance: {maxBalance} {jetton.jetton.symbol}
                </span>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex space-x-2">
              <Input
                id="amount"
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleMaxClick} type="button">
                Max
              </Button>
            </div>
            {amount && (
              <p className="text-sm text-muted-foreground">
                {amount} {jetton.jetton.symbol}
              </p>
            )}
          </div>

          {/* Recipient Input */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="Enter recipient address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            {recipient && !isValidRecipient() && (
              <p className="text-sm text-destructive">Invalid address format</p>
            )}
          </div>

          {/* Transfer Button */}
          <Button onClick={handleTransfer} disabled={!canTransfer} className="w-full">
            {isLoading ? 'Processing...' : 'Transfer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
