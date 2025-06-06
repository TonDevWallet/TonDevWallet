import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import SendTon from '@/components/wallets/tonweb/SendTon'
import { IWallet } from '@/types'
import { Key } from '@/types/Key'
import { ManagedSendMessageResult } from '@/utils/ManagedBlockchain'
import { formatUnits } from '@/utils/units'
import { faCopy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Address, Cell } from '@ton/ton'
import { memo, useCallback, useMemo, useState } from 'react'

export const CopyTransactionButton = memo(function CopyTransactionButton({
  txInfo,
  wallet,
  selectedKey,
}: {
  txInfo: ManagedSendMessageResult | undefined
  wallet: IWallet | undefined
  selectedKey: Key
}) {
  const [sendDialogOpen, setSendDialogOpen] = useState(false)

  // Get the first transfer to populate the SendTon component
  const firstTransfer = useMemo(() => {
    const firstTransaction = txInfo?.transactions?.[0]
    if (!firstTransaction) {
      return null
    }
    if (firstTransaction.outMessages) {
      const outMessages = firstTransaction.outMessages.values()
      for (const msg of outMessages) {
        if (msg.info.type === 'internal') {
          // Extract body as base64
          let bodyBase64 = ''
          if (msg.body) {
            try {
              // Get the raw body cell as base64
              bodyBase64 = msg.body.toBoc().toString('base64')
            } catch (e) {
              console.error('Failed to convert body to base64:', e)
            }
          }

          // Extract init (stateInit) as base64 if present
          let initBase64 = ''
          try {
            if (msg.init) {
              // The TL-B structure for init is a Maybe of Either, so we need to check types
              const initCell = (msg.init as any).value?.value
              if (initCell instanceof Cell) {
                initBase64 = initCell.toBoc().toString('base64')
              }
            }
          } catch (e) {
            console.error('Failed to convert state init to base64:', e)
          }
          const bounceable = msg.info.bounce

          return {
            address: msg.info.dest?.toString({
              urlSafe: true,
              bounceable,
            }),
            fromAddress: firstTransaction.inMessage?.info.dest as Address,
            amount: formatUnits(msg.info.value.coins, 9),
            message: bodyBase64,
            isBase64: true, // Mark as base64
            stateInit: initBase64,
          }
        }
      }
    }
    return null
  }, [txInfo])

  const handleTransactionSent = useCallback(() => {
    // Close the dialog when transaction is sent
    setSendDialogOpen(false)
  }, [])

  return (
    <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
      <Button
        variant={'outline'}
        className={''}
        onClick={() => setSendDialogOpen(true)}
        disabled={!firstTransfer}
      >
        <FontAwesomeIcon icon={faCopy} className={'mr-2'} />
        Copy transaction
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer TON</DialogTitle>
        </DialogHeader>
        {firstTransfer && (
          <div>
            {wallet && selectedKey ? (
              <SendTon
                wallet={wallet}
                selectedKey={selectedKey}
                initialRecipient={firstTransfer.address}
                initialAmount={firstTransfer.amount}
                initialMessage={firstTransfer.message}
                initialStateInit={firstTransfer.stateInit}
                initialMessageBase64={firstTransfer.isBase64}
                onSend={handleTransactionSent}
              />
            ) : (
              <div className="text-center p-3">
                <p>You can use these transaction details to create a new transaction.</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
})
