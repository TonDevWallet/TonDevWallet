import { Address, Cell } from '@ton/core'
import { ConnectMessageTransactionMessage } from '@/types/connect'

/**
 * Magic number for W5R1 plugin installation detection.
 * "tondevwallet_add_extension_w5r1"c;
 */
export const MAGIC_ADD_PLUGIN = 0xae871e9f

/**
 * Expected bit length for plugin installation payload:
 * 32 bits (magic op) + 267 bits (address) = 299 bits
 */
const EXPECTED_PAYLOAD_BITS = 299

export interface PluginDetectionResult {
  isPluginInstall: false
}

export interface PluginDetectionResultSuccess {
  isPluginInstall: true
  pluginAddress: Address
}

export type DetectW5PluginResult = PluginDetectionResult | PluginDetectionResultSuccess

/**
 * Detects if a TonConnect sendTransaction message is a W5R1 plugin installation request.
 *
 * Detection criteria:
 * 1. Wallet type must be 'v5R1'
 * 2. Transaction must contain exactly 1 message
 * 3. Message payload must be exactly 299 bits (32-bit op + 267-bit address)
 * 4. First 32 bits must match MAGIC_ADD_PLUGIN
 *
 * @param messages - Array of TonConnect transaction messages
 * @param walletType - Type of the wallet (e.g., 'v5R1', 'v4R2')
 * @returns Detection result with plugin address if detected
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

    // Check bit length (32 op + 267 address = 299 bits)
    const totalBits = slice.remainingBits
    if (totalBits !== EXPECTED_PAYLOAD_BITS) {
      return { isPluginInstall: false }
    }

    // Check if there are no refs (pure data cell)
    if (slice.remainingRefs !== 0) {
      return { isPluginInstall: false }
    }

    // Read the magic op code (first 32 bits)
    const op = slice.loadUint(32)
    if (op !== MAGIC_ADD_PLUGIN) {
      return { isPluginInstall: false }
    }

    // Read the plugin address (remaining 267 bits)
    const pluginAddress = slice.loadAddress()
    if (!pluginAddress) {
      return { isPluginInstall: false }
    }

    return {
      isPluginInstall: true,
      pluginAddress,
    }
  } catch (e) {
    // If parsing fails, it's not a valid plugin installation request
    return { isPluginInstall: false }
  }
}
