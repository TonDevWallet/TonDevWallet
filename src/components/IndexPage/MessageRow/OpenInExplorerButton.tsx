import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Cell } from '@ton/ton'
import { memo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { NormalizeMessage } from '@/utils/ton'
import { useLiteclientState } from '@/store/liteClient'

export const OpenInExplorerButton = memo(function OpenInExplorerButton({ cell }: { cell: Cell }) {
  const scannerUrlState = useLiteclientState().selectedNetwork.scanner_url

  const handleOpenInExplorer = useCallback(() => {
    try {
      const normaliedMessage = NormalizeMessage(cell)
      const scannerUrl = scannerUrlState.get() || 'https://tonviewer.com/'

      const hash = normaliedMessage.hash().toString('hex')
      window.open(`${scannerUrl}transaction/${hash}`, '_blank', 'noopener,noreferrer')
    } catch (e) {
      console.error('Failed to open in explorer', e)
    }
  }, [cell, scannerUrlState])

  return (
    <Button
      variant={'outline'}
      className={'w-48'}
      onClick={handleOpenInExplorer}
      title="Open in tonviewer.com"
    >
      <FontAwesomeIcon icon={faExternalLinkAlt} className={'mr-2'} />
      Open in Explorer
    </Button>
  )
})
