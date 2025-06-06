import { Block } from '@/components/ui/Block'
import { Button } from '@/components/ui/button'
import { useLiteclientState } from '@/store/liteClient'
import { IWallet } from '@/types'
import { Key } from '@/types/Key'
import { cn } from '@/utils/cn'
import { downloadGraph } from '@/utils/graphDownloader'
import { ManagedSendMessageResult } from '@/utils/ManagedBlockchain'
import { faDownload, faExpand } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Cell } from '@ton/ton'
import { useCallback, useMemo, useState } from 'react'
import { MessageFlow } from '../MessageFlow'
import { CopyExternalButton } from './CopyExternalButton'
import { CopyTransactionButton } from './CopyTransactionButton'
import { OpenInExplorerButton } from './OpenInExplorerButton'

export function MessageEmulationResult({
  txInfo,
  isLoading,
  wallet,
  selectedKey,
  unsignedExternal,
  signedExternal,
}: {
  txInfo: ManagedSendMessageResult | undefined
  isLoading: boolean
  wallet: IWallet | undefined
  selectedKey: Key
  unsignedExternal: Cell | undefined
  signedExternal: Cell | undefined
}) {
  const isTestnet = useLiteclientState().selectedNetwork.is_testnet.get()
  const [max, setMax] = useState(false)

  const handleDownloadGraph = useCallback(async () => {
    if (txInfo?.transactions) {
      await downloadGraph(txInfo.transactions)
    }
  }, [txInfo])

  // for test purposes, use serdes graph to display it
  // const serdesGraph = DeserializeTransactionsList(
  //   SerializeTransactionsList(txInfo?.transactions || [])
  // )
  const serdesGraph = {
    transactions: txInfo?.transactions,
  }

  const externalBoc = useMemo(() => {
    if (!unsignedExternal) {
      return undefined
    }
    return unsignedExternal.toBoc().toString('base64')
  }, [unsignedExternal])

  return (
    <>
      <div className="flex flex-col">
        <div className="break-words break-all flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button variant={'outline'} className={''} onClick={() => setMax((v) => !v)}>
              <FontAwesomeIcon icon={faExpand} className={'mr-2'} />
              Toggle Preview Size
            </Button>

            <Button variant={'outline'} className={''} onClick={handleDownloadGraph}>
              <FontAwesomeIcon icon={faDownload} className={'mr-2'} />
              Download graph
            </Button>

            <CopyTransactionButton txInfo={txInfo} wallet={wallet} selectedKey={selectedKey} />
            {externalBoc && <CopyExternalButton copyData={externalBoc} />}
            {signedExternal && <OpenInExplorerButton cell={signedExternal} />}
          </div>

          <Block
            className={cn('h-[50vh]', max && 'h-[90vh]', 'p-0')}
            bg={isTestnet ? 'bg-[#22351f]' : 'bg-transparent'}
          >
            {!isLoading && <MessageFlow transactions={serdesGraph.transactions} />}
          </Block>
        </div>
      </div>
    </>
  )
}
