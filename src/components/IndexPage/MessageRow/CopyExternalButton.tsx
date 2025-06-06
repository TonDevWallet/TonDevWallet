import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { memo, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'

export const CopyExternalButton = memo(function CopyExternalButton({
  copyData,
}: {
  copyData: string
}) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopyOk = useCallback(async () => {
    await navigator.clipboard.writeText(copyData)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 1500)
  }, [copyData])

  return (
    <Button variant={'outline'} className={'w-36'} onClick={handleCopyOk}>
      {isCopied ? (
        <>
          <FontAwesomeIcon icon={faCheck} className={'mr-2'} />
          Copied
        </>
      ) : (
        <>
          <FontAwesomeIcon icon={faCopy} className={'mr-2'} />
          Copy External
        </>
      )}
    </Button>
  )
})
