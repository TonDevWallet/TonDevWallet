import { useState } from 'react'
import { BlueButton } from '../ui/BlueButton'
import { FromMnemonic } from './FromMnemonic'
import { FromRandom } from './FromRandom'
import { FromSeed } from './FromSeed'

export function NewWalletPage() {
  const [createMode, setCreateMode] = useState<'random' | 'mnemonic' | 'seed'>('random')

  return (
    <div className="mt-8">
      <h1 className="font-bold text-xl text-accent">New Wallet</h1>
      <div className="flex gap-2 mt-4">
        <BlueButton onClick={() => setCreateMode('random')}>Create random wallet</BlueButton>
        <BlueButton onClick={() => setCreateMode('mnemonic')}>From Mnemonic</BlueButton>
        <BlueButton onClick={() => setCreateMode('seed')}>From Seed</BlueButton>
      </div>

      <div className="mt-4"></div>
      {createMode === 'random' && <FromRandom />}
      {createMode === 'mnemonic' && <FromMnemonic />}
      {createMode === 'seed' && <FromSeed />}
    </div>
  )
}
