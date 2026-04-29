import { SavedWalletRow } from './SavedWalletRow'
import { suspend } from '@hookstate/core'
import { useWalletListState } from '@/store/walletsListState'
import { useAppInfo } from '@/hooks/useAppInfo'

export function SavedWalletsList() {
  const keys = useWalletListState()

  const { version } = useAppInfo()

  return (
    suspend(keys) || (
      <div className="p-2">
        {keys &&
          keys.map((dbWallet) => <SavedWalletRow walletKey={dbWallet} key={dbWallet.get().id} />)}

        <div className="text-center mt-4 text-sm text-gray-400">v{version}</div>
      </div>
    )
  )
}
