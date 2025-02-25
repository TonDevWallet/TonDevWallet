import { ChangePasswordPopup } from '../SavedWalletsList/ChangePasswordPopup'
import NetworkSettings from './NetworkSettings'
import ExtraCurrencySettings from './ExtraCurrencySettings'

export function SettingsPage() {
  return (
    <div>
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-4xl">Settings</h1>

      <ChangePasswordPopup />
      <NetworkSettings />
      <ExtraCurrencySettings />
    </div>
  )
}
