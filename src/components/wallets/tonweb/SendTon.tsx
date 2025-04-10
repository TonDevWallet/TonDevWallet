import { useEffect, useState } from 'react'
import { Address } from '@ton/core'
import { IWallet } from '@/types'
import { textToWalletBody } from '@/utils/textToWalletBody'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { addConnectMessage } from '@/store/connectMessages'
import { useNavigate } from 'react-router-dom'
import useExtraCurrencies from '@/hooks/useExtraCurrencies'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { parseTon, parseUnits } from '@/utils/units'
import { Key } from '@/types/Key'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Label } from '@/components/ui/label'
import { InfoCircledIcon } from '@radix-ui/react-icons'

export default function SendTon({ wallet, selectedKey }: { wallet: IWallet; selectedKey: Key }) {
  const navigate = useNavigate()
  const { currentNetworkCurrencies: currencies } = useExtraCurrencies()

  const [amount, setAmount] = useState('0')
  const [recepient, setRecepient] = useState('')
  const [message, setMessage] = useState('')
  const [stateInit, setStateInit] = useState('')
  const [message64, setMessage64] = useState(false)
  const [extraCurrencyAmount, setExtraCurrencyAmount] = useState('0')
  const [extraCurrencyCode, setExtraCurrencyCode] = useState('')
  // const [availableCurrencies, setAvailableCurrencies] = useState<Record<string, any>>({})

  // Message mode state
  const [messageMode, setMessageMode] = useState('3') // Default mode: Pay fees separately + Ignore errors
  const [modeFlags, setModeFlags] = useState({
    payFeesSeparately: true, // +1
    ignoreErrors: true, // +2
    bounceOnFail: false, // +16
    destroyIfZero: false, // +32
  })
  const [modeBase, setModeBase] = useState('0') // 0, 64, or 128

  // Update flags and base when messageMode changes
  const updateFlagsFromMode = (mode: string) => {
    const modeInt = parseInt(mode)
    setModeFlags({
      payFeesSeparately: !!(modeInt & 1),
      ignoreErrors: !!(modeInt & 2),
      bounceOnFail: !!(modeInt & 16),
      destroyIfZero: !!(modeInt & 32),
    })

    // Reset base to determine mode base (0, 64, 128)
    if (modeInt & 128) {
      setModeBase('128')
    } else if (modeInt & 64) {
      setModeBase('64')
    } else {
      setModeBase('0')
    }
  }

  // Handle direct mode input change
  const handleModeChange = (value: string) => {
    // Validate input is a number
    if (/^\d+$/.test(value) || value === '') {
      const newMode = value === '' ? '0' : value
      setMessageMode(newMode)
      updateFlagsFromMode(newMode)
    }
  }

  // Handle flag checkbox changes
  const handleFlagChange = (flag: keyof typeof modeFlags, checked: boolean) => {
    const newFlags = { ...modeFlags, [flag]: checked }
    setModeFlags(newFlags)

    // Recalculate mode after flag change
    let newMode = parseInt(modeBase)
    if (newFlags.payFeesSeparately) newMode += 1
    if (newFlags.ignoreErrors) newMode += 2
    if (newFlags.bounceOnFail) newMode += 16
    if (newFlags.destroyIfZero) newMode += 32
    setMessageMode(newMode.toString())
  }

  // Handle base mode selection
  const handleBaseChange = (value: string) => {
    // Validate that only one of 0, 64, 128 is selected
    if (value === '0' || value === '64' || value === '128') {
      setModeBase(value)

      // Recalculate mode with new base and existing flags
      let newMode = parseInt(value)
      if (modeFlags.payFeesSeparately) newMode += 1
      if (modeFlags.ignoreErrors) newMode += 2
      if (modeFlags.bounceOnFail) newMode += 16
      if (modeFlags.destroyIfZero) newMode += 32
      setMessageMode(newMode.toString())
    }
  }

  useEffect(() => {
    if (extraCurrencyCode && !currencies[extraCurrencyCode] && extraCurrencyCode !== 'none') {
      setExtraCurrencyCode('')
    }

    setAmount('0')
    setRecepient('')
    setMessage('')
    setStateInit('')
    setMessage64(false)
    setExtraCurrencyAmount('0')
    setMessageMode('3') // Reset to default
    updateFlagsFromMode('3')
  }, [wallet])

  const addMessageToEmulation = async () => {
    Address.parseFriendly(recepient)

    const keyId = selectedKey?.id
    if (typeof keyId === 'undefined') {
      return
    }

    // Only include extra currency if one is selected and not 'none'
    const extraCurrency =
      extraCurrencyCode && extraCurrencyCode !== 'none'
        ? {
            [extraCurrencyCode]: parseUnits(
              extraCurrencyAmount,
              currencies[extraCurrencyCode].decimals
            ).toString(),
          }
        : {}

    await addConnectMessage({
      connect_event_id: 0,
      connect_session_id: 0,
      key_id: keyId,
      wallet_id: wallet.id,
      status: 0,
      payload: {
        messages: [
          {
            address: recepient,
            amount: parseTon(amount).toString(),
            payload: textToWalletBody(message, message64)?.toBoc()?.toString('base64'),
            extra_currency: extraCurrency,
          },
        ],
        valid_until: Date.now(),
      },
      wallet_address: wallet.address.toRawString(),
      message_mode: parseInt(messageMode),
    })
    navigate('/app')
  }

  // First let's define a custom component for mode labels
  const modeDescriptions = {
    '0': 'Ordinary message',
    '64': 'Carry remaining value from inbound message',
    '128': 'Carry all remaining contract balance',
  }

  return (
    <div className="flex flex-col">
      {/* <div className="font-medium text-lg">Send TON:</div> */}

      <div className="mt-2 flex flex-col">
        <label htmlFor="toInput">Recipient:</label>
        <Input
          className="border rounded p-2"
          id="toInput"
          type="text"
          value={recepient}
          onChange={(e: any) => setRecepient(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="amountInput">Amount:</label>
        <Input
          className="border rounded p-2"
          id="amountInput"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={amount}
          onChange={(e: any) => setAmount(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="extraCurrencySelect">Extra Currency:</label>
        <div className="flex gap-2">
          <Input
            className="border rounded p-2 flex-1"
            id="extraCurrencyInput"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={extraCurrencyAmount}
            onChange={(e: any) => setExtraCurrencyAmount(e.target.value)}
            autoComplete="off"
            placeholder="0"
          />
          <Select value={extraCurrencyCode} onValueChange={setExtraCurrencyCode}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {Object.entries(currencies).map(([id, meta]) => (
                <SelectItem key={id} value={id}>
                  {meta.symbol || id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {extraCurrencyCode && extraCurrencyCode !== 'none' && currencies[extraCurrencyCode] && (
          <p className="text-xs text-muted-foreground mt-1">
            {currencies[extraCurrencyCode].symbol || extraCurrencyCode} (Decimals:{' '}
            {currencies[extraCurrencyCode].decimals})
          </p>
        )}
      </div>

      {/* Message Mode Selector */}
      <div className="mt-2 flex flex-col">
        <div className="flex items-center gap-1 mb-1">
          <label htmlFor="messageModeInput">Message Mode:</label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <InfoCircledIcon className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3">
                <div className="space-y-2">
                  <p className="font-semibold">Base Modes:</p>
                  <ul className="text-xs space-y-1 pl-2">
                    <li>
                      <span className="font-semibold">0:</span> Ordinary message
                    </li>
                    <li>
                      <span className="font-semibold">64:</span> Carry all remaining value from
                      inbound message
                    </li>
                    <li>
                      <span className="font-semibold">128:</span> Carry all remaining contract
                      balance
                    </li>
                  </ul>
                  <p className="font-semibold">Flags:</p>
                  <ul className="text-xs space-y-1 pl-2">
                    <li>
                      <span className="font-semibold">+1:</span> Pay transfer fees separately from
                      message value
                    </li>
                    <li>
                      <span className="font-semibold">+2:</span> Ignore errors during processing
                      (recommended)
                    </li>
                    <li>
                      <span className="font-semibold">+16:</span> Bounce on failure (return funds if
                      action fails)
                    </li>
                    <li>
                      <span className="font-semibold">+32:</span> Destroy contract if resulting
                      balance is zero
                    </li>
                  </ul>
                  <p className="text-xs italic mt-1">
                    Default (3) = Pay fees separately + Ignore errors
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex gap-2 items-center mb-2">
          <Input
            className="w-20 text-center h-10"
            id="messageModeInput"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={messageMode}
            onChange={(e) => handleModeChange(e.target.value)}
            autoComplete="off"
          />

          <div className="flex flex-wrap gap-x-4 gap-y-1 flex-1">
            <Select value={modeBase} onValueChange={handleBaseChange}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Base Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0" textValue="Mode 0">
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">Mode 0</span>
                    <span className="text-xs text-muted-foreground">{modeDescriptions['0']}</span>
                  </div>
                </SelectItem>
                <SelectItem value="64" textValue="Mode 64">
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">Mode 64</span>
                    <span className="text-xs text-muted-foreground">{modeDescriptions['64']}</span>
                  </div>
                </SelectItem>
                <SelectItem value="128" textValue="Mode 128">
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">Mode 128</span>
                    <span className="text-xs text-muted-foreground">{modeDescriptions['128']}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="payFeesCheck"
              checked={modeFlags.payFeesSeparately}
              onCheckedChange={(checked) => handleFlagChange('payFeesSeparately', !!checked)}
            />
            <Label htmlFor="payFeesCheck" className="text-sm cursor-pointer">
              Pay fees separately (+1)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="ignoreErrorsCheck"
              checked={modeFlags.ignoreErrors}
              onCheckedChange={(checked) => handleFlagChange('ignoreErrors', !!checked)}
            />
            <Label htmlFor="ignoreErrorsCheck" className="text-sm cursor-pointer">
              Ignore errors (+2)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="bounceCheck"
              checked={modeFlags.bounceOnFail}
              onCheckedChange={(checked) => handleFlagChange('bounceOnFail', !!checked)}
            />
            <Label htmlFor="bounceCheck" className="text-sm cursor-pointer">
              Bounce on fail (+16)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="destroyCheck"
              checked={modeFlags.destroyIfZero}
              onCheckedChange={(checked) => handleFlagChange('destroyIfZero', !!checked)}
            />
            <Label htmlFor="destroyCheck" className="text-sm cursor-pointer">
              Destroy if zero (+32)
            </Label>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="messageInput">Message:</label>
        <div className="flex items-center">
          <label htmlFor="base64Check" className="text-sm text-foreground/75 my-1 cursor-pointer">
            Base64 cell?
          </label>
          <Checkbox
            id="base64Check"
            checked={message64}
            onCheckedChange={(e: any) => {
              console.log('change', e)
              setMessage64((c) => !c)
            }}
            className="ml-2"
          />
        </div>
        <Input
          className="border rounded p-2"
          id="messageInput"
          type="text"
          value={message}
          onChange={(e: any) => setMessage(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="mt-2 flex flex-col">
        <label htmlFor="stateInitInput">StateInit:</label>
        <p className="text-foreground/75 text-sm my-1">Base64 encoded state init cell</p>
        <Input
          className="border rounded p-2"
          id="stateInitInput"
          type="text"
          value={stateInit}
          onChange={(e: any) => setStateInit(e.target.value)}
          autoComplete="off"
        />
      </div>

      <Button className="w-full mt-2" onClick={addMessageToEmulation}>
        Emulate
      </Button>
    </div>
  )
}
