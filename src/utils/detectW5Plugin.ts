import { Address, Cell, Slice } from '@ton/core'
import { ConnectMessageTransactionMessage } from '@/types/connect'

/**
 * Magic number for W5R1 plugin installation detection.
 * "tondevwallet_add_extension_w5r1"c;
 */
export const MAGIC_ADD_PLUGIN = 0xae871e9f

/**
 * Minimum bit length for plugin installation payload:
 * 32 bits (magic op) + 2 bits (addr_none) = 34 bits minimum
 * 32 bits (magic op) + 267 bits (address) = 299 bits with address
 */
const MIN_PAYLOAD_BITS = 34

export interface PluginDetectionResult {
  isPluginInstall: false
}

export interface PluginDetectionResultSuccess {
  isPluginInstall: true
  pluginAddress: Address | null // null means addr_none (only removal, no install)
  pluginsToRemove: Address[]
}

export type DetectW5PluginResult = PluginDetectionResult | PluginDetectionResultSuccess

/**
 * Recursively parses a snake-like Maybe structure to extract addresses to remove.
 *
 * Structure: Maybe(address, ^Maybe(address, ^Maybe(...)))
 * - If ref exists, load address from current cell and recurse into ref
 * - If no ref, stop recursion
 *
 * @param slice - The slice to parse
 * @returns Array of addresses to remove
 */
function parseRemovalAddresses(slice: Slice): Address[] {
  const addresses: Address[] = []

  // Check if there's a ref (Maybe has value)
  if (slice.remainingRefs === 0) {
    return addresses
  }

  // Load the address from the ref
  const refCell = slice.loadRef()
  const refSlice = refCell.beginParse()

  if (refSlice.remainingBits < 267) {
    return addresses
  }

  // Read the address (267 bits)
  const address = refSlice.loadAddress()
  if (address) {
    addresses.push(address)

    // Recursively parse the next Maybe ref
    const nestedAddresses = parseRemovalAddresses(refSlice)
    addresses.push(...nestedAddresses)
  }

  return addresses
}

/**
 * Detects if a TonConnect sendTransaction message is a W5R1 plugin installation request.
 *
 * Detection criteria:
 * 1. Wallet type must be 'v5R1'
 * 2. Transaction must contain exactly 1 message
 * 3. Message payload must be at least 34 bits (32-bit op + 2-bit addr_none)
 * 4. First 32 bits must match MAGIC_ADD_PLUGIN
 *
 * Payload format:
 * - 32 bits: magic op
 * - MsgAddress: plugin address to install (addr_none if only removing)
 * - ^Maybe(address_to_remove, ^Maybe(address_to_remove, ...)) - snake-like structure in refs
 *
 * @param messages - Array of TonConnect transaction messages
 * @param walletType - Type of the wallet (e.g., 'v5R1', 'v4R2')
 * @returns Detection result with plugin address and plugins to remove if detected
 */
export function detectW5PluginInstallation(
  messages: ConnectMessageTransactionMessage[],
  walletType: string
): DetectW5PluginResult {
  // Check if wallet is W5R1
  if (walletType !== 'v5R1') {
    return { isPluginInstall: false }
  }

  // Check if exactly 1 message
  if (messages.length !== 1) {
    return { isPluginInstall: false }
  }

  const message = messages[0]

  // Check if payload exists
  if (!message.payload) {
    return { isPluginInstall: false }
  }

  try {
    // Parse the payload BOC
    const payloadCell = Cell.fromBase64(message.payload)
    const slice = payloadCell.beginParse()

    // Check minimum bit length (32 op + 2 bits addr_none = 34 bits)
    const totalBits = slice.remainingBits
    if (totalBits < MIN_PAYLOAD_BITS) {
      return { isPluginInstall: false }
    }

    // Read the magic op code (first 32 bits)
    const op = slice.loadUint(32)
    if (op !== MAGIC_ADD_PLUGIN) {
      return { isPluginInstall: false }
    }

    // Read the plugin address to install (MsgAddress - can be addr_none)
    // loadMaybeAddress returns null for addr_none
    const pluginAddress = slice.loadMaybeAddress()

    // Parse optional removal addresses from snake-like Maybe structure in refs
    const pluginsToRemove = parseRemovalAddresses(slice)

    // Must have at least one action (install or remove)
    if (!pluginAddress && pluginsToRemove.length === 0) {
      return { isPluginInstall: false }
    }

    return {
      isPluginInstall: true,
      pluginAddress,
      pluginsToRemove,
    }
  } catch (e) {
    // If parsing fails, it's not a valid plugin installation request
    return { isPluginInstall: false }
  }
}
