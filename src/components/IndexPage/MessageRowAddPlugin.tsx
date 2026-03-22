import { TonConnectMessageAddPlugin } from '@/store/connectMessages'
import { useLiteclient } from '@/store/liteClient'
import { openPasswordPopup, useDecryptWalletData, usePassword } from '@/store/passwordManager'
import { useTonConnectSessions } from '@/store/tonConnect'
import { useWalletListState } from '@/store/walletsListState'
import {
  ApproveTonConnectMessageAddPlugin,
  RejectTonConnectMessageAddPlugin,
} from '@/utils/tonConnect'
import { getWalletFromKey } from '@/utils/wallets'
import { ImmutableObject, State } from '@hookstate/core'
import { memo, useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { AddressRow } from '../AddressRow'
import { Block } from '../ui/Block'
import { BlueButton } from '../ui/BlueButton'
import { cn } from '@/utils/cn'
import { secretKeyToED25519 } from '@/utils/ed25519'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Address } from '@ton/core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlug,
  faExclamationTriangle,
  faSkullCrossbones,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '../ui/alert-dialog'
import { Button } from '../ui/button'

export const MessageRowAddPlugin = memo(function MessageRowAddPlugin({
  s,
}: {
  s: State<ImmutableObject<TonConnectMessageAddPlugin>>
}) {
  const keys = useWalletListState()
  const liteClient = useLiteclient()
  const sessions = useTonConnectSessions()
  const password = usePassword().password.get()

  const key = useMemo(() => {
    return keys.find((k) => k.id.get() === s.key_id.get())
  }, [keys])
  if (!key) {
    return <></>
  }

  const wallet = useMemo(() => key.wallets.get()?.find((w) => w.id === s.wallet_id.get()), [key])
  if (!wallet) {
    return <></>
  }

  const session = useMemo(
    () => sessions.find((session) => session.id.get() === s.connect_session_id.get()),
    [sessions]
  )

  const { decryptedData } = useDecryptWalletData(password, key.encrypted?.get() || undefined)

  const walletKeyPair = useMemo(() => {
    if (!decryptedData) {
      return undefined
    }
    return secretKeyToED25519(decryptedData?.seed || Buffer.from([]))
  }, [key.encrypted, decryptedData])

  const tonWallet = useMemo(
    () => getWalletFromKey(liteClient, key.get(), wallet),
    [liteClient, wallet, key]
  )

  const pluginAddress = useMemo(() => {
    const addr = s.plugin_address.get()
    if (!addr) {
      return null // addr_none - removal only
    }
    try {
      return Address.parse(addr)
    } catch {
      return undefined // invalid address
    }
  }, [s.plugin_address])

  const pluginsToRemove = useMemo(() => {
    const addresses = s.plugins_to_remove?.get()
    if (!addresses || addresses.length === 0) {
      return []
    }
    return addresses
      .map((addr) => {
        try {
          return Address.parse(addr)
        } catch {
          return undefined
        }
      })
      .filter((addr): addr is Address => addr !== undefined)
  }, [s.plugins_to_remove])

  // Check if this is a valid request (either install or remove)
  //   const isValidRequest = pluginAddress !== undefined || pluginsToRemove.length > 0
  const isRemovalOnly = pluginAddress === null && pluginsToRemove.length > 0

  // Alert dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Hold-to-confirm state
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const holdDuration = 3000 // 3 seconds
  const updateInterval = 50 // Update every 50ms for smooth progress

  const rejectConnectMessage = () => {
    RejectTonConnectMessageAddPlugin({
      message: s.get(),
      session: session?.get(),
    })
  }

  const approveConnectMessage = async () => {
    // pluginAddress can be null (removal only) but not undefined (invalid)
    if (!walletKeyPair || pluginAddress === undefined) {
      return
    }
    setIsDialogOpen(false)
    await ApproveTonConnectMessageAddPlugin({
      liteClient,
      message: s.get(),
      session: session?.get(),
      walletKeyPair,
      pluginAddress,
      pluginsToRemove,
      key: key.get(),
      wallet,
    })
  }

  const startHold = useCallback(() => {
    setIsHolding(true)
    setHoldProgress(0)

    const startTime = Date.now()
    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / holdDuration) * 100, 100)
      setHoldProgress(progress)

      if (progress >= 100) {
        if (holdIntervalRef.current) {
          clearInterval(holdIntervalRef.current)
          holdIntervalRef.current = null
        }
        setIsHolding(false)
        approveConnectMessage()
      }
    }, updateInterval)
  }, [approveConnectMessage])

  const stopHold = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
    setIsHolding(false)
    setHoldProgress(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current)
      }
    }
  }, [])

  const openConfirmDialog = () => {
    setIsDialogOpen(true)
    setHoldProgress(0)
  }

  return (
    <Block className="">
      {/* Header with plugin icon */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            isRemovalOnly ? 'bg-red-500/20' : 'bg-amber-500/20'
          )}
        >
          <FontAwesomeIcon
            icon={isRemovalOnly ? faTrash : faPlug}
            className={cn('text-lg', isRemovalOnly ? 'text-red-500' : 'text-amber-500')}
          />
        </div>
        <div>
          <h3 className="font-semibold text-lg">
            {isRemovalOnly ? 'Plugin Removal Request' : 'Plugin Installation Request'}
          </h3>
          <p className="text-sm text-muted-foreground">W5R1 Extension</p>
        </div>
      </div>

      {/* Session info */}
      {session?.url.get() && (
        <div className="flex items-center mb-4">
          <Avatar className="w-8 h-8">
            <AvatarImage src={session?.iconUrl.get()} />
            <AvatarFallback>C</AvatarFallback>
          </Avatar>

          <div className="ml-2">{session?.name.get()}</div>
          <a href={session?.url.get()} target="_blank" className="ml-2" rel="noopener noreferrer">
            {session?.url.get()}
          </a>
        </div>
      )}

      {/* Wallet info */}
      <div className="break-keep mb-2">
        <AddressRow
          text={<div className="w-40 shrink-0">{`Wallet (${wallet.type}): `}</div>}
          address={tonWallet?.address}
        />
      </div>

      {/* Plugins to remove - if any */}
      {pluginsToRemove.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 my-4">
          <div className="flex items-center gap-2 mb-2">
            <FontAwesomeIcon icon={faTrash} className="text-red-500" />
            <span className="font-medium text-red-600 dark:text-red-400">
              Plugins to Remove ({pluginsToRemove.length})
            </span>
          </div>
          <div className="space-y-2">
            {pluginsToRemove.map((addr, index) => (
              <AddressRow
                key={index}
                address={addr}
                addressClassName="text-sm font-mono"
                containerClassName="bg-background/50 rounded p-2"
              />
            ))}
          </div>
        </div>
      )}

      {/* Plugin address - highlighted (only show if not removal-only) */}
      {!isRemovalOnly && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 my-4">
          <div className="flex items-center gap-2 mb-2">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500" />
            <span className="font-medium text-amber-600 dark:text-amber-400">
              Plugin Address to Install
            </span>
          </div>
          {pluginAddress ? (
            <AddressRow
              address={pluginAddress}
              addressClassName="text-sm font-mono"
              containerClassName="bg-background/50 rounded p-2"
            />
          ) : (
            <div className="text-red-500">Invalid plugin address</div>
          )}
        </div>
      )}

      {/* Warning message */}
      <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted/50 rounded-lg">
        <p>
          <strong>Warning:</strong>{' '}
          {isRemovalOnly
            ? 'This will remove the specified plugin(s) from your wallet.'
            : 'Installing a plugin grants it the ability to execute transactions on behalf of your wallet. Only approve if you trust the source.'}
        </p>
      </div>

      {/* Action buttons */}
      {password ? (
        <>
          <div className="flex items-center gap-2 my-2">
            <BlueButton variant={'outline'} onClick={rejectConnectMessage}>
              Reject
            </BlueButton>
            <BlueButton
              onClick={openConfirmDialog}
              className={cn(
                isRemovalOnly ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600',
                'disabled:bg-gray-400'
              )}
              disabled={!walletKeyPair || pluginAddress === undefined}
            >
              {isRemovalOnly ? 'Remove Plugin' : 'Install Plugin'}
            </BlueButton>
          </div>
        </>
      ) : (
        <>
          <BlueButton onClick={rejectConnectMessage}>Reject</BlueButton>
          <BlueButton onClick={openPasswordPopup} className="ml-2 mt-2 bg-green-500">
            Unlock wallet
          </BlueButton>
        </>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="border-red-50 bg-red-950">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faSkullCrossbones} className="text-red-500 text-xl" />
              </div>
              <AlertDialogTitle className="text-red-500 text-xl">
                {isRemovalOnly ? 'Confirm Plugin Removal' : 'Danger: Plugin Installation'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-200">
                  {isRemovalOnly ? (
                    <>
                      <p className="font-semibold mb-2">You are about to remove plugin(s)</p>
                      <p className="text-sm">
                        The specified plugin(s) will no longer be able to execute transactions on
                        behalf of your wallet.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold mb-2">This action is extremely dangerous!</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>The plugin will have full control over your wallet</li>
                        <li>It can send transactions without your approval</li>
                        <li>It can drain all your funds</li>
                        <li>This action cannot be easily undone</li>
                      </ul>
                    </>
                  )}
                </div>

                {pluginsToRemove.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2 text-red-400">
                      Plugins to be removed ({pluginsToRemove.length}):
                    </p>
                    <div className="space-y-1">
                      {pluginsToRemove.map((addr, index) => (
                        <code
                          key={index}
                          className="block bg-red-500/20 rounded p-2 text-xs break-all"
                        >
                          {addr.toString()}
                        </code>
                      ))}
                    </div>
                  </div>
                )}

                {!isRemovalOnly && (
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">Plugin address to be installed:</p>
                    <code className="block bg-background/50 rounded p-2 text-xs break-all">
                      {pluginAddress?.toString()}
                    </code>
                  </div>
                )}

                <p className="text-sm text-amber-400 font-medium">
                  {isRemovalOnly
                    ? 'Confirm that you want to remove these plugin(s).'
                    : 'Only proceed if you fully understand the risks and trust the plugin source.'}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className={cn('')} onClick={stopHold}>
              Cancel
            </AlertDialogCancel>
            <Button
              className={cn(
                'relative overflow-hidden text-white transition-colors',
                'bg-red-600 hover:bg-red-700',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'w-48'
              )}
              onMouseDown={startHold}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={startHold}
              onTouchEnd={stopHold}
              disabled={!walletKeyPair || pluginAddress === undefined}
            >
              {/* Progress bar background */}
              <div
                className="absolute inset-0 bg-green-500 transition-all duration-75"
                style={{ width: `${holdProgress}%` }}
              />
              {/* Button text */}
              <span className="relative z-10">
                {isHolding
                  ? `Hold... ${Math.ceil((holdDuration - (holdProgress / 100) * holdDuration) / 1000)}s`
                  : isRemovalOnly
                    ? 'Hold 3s to Remove'
                    : 'Hold 3s to Install'}
              </span>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Block>
  )
})
