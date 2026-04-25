import { Buffer } from 'buffer'
import { hookstate, useHookstate } from '@hookstate/core'
import { useEffect, useState } from 'react'

export interface PasswordInfo {
  password?: string
  passwordExists: boolean
  popupOpen: boolean
}

export interface EncryptedWalletData {
  seed?: string
  mnemonic?: string
  cypher: 'encrypted-scrypt-tweetnacl'
  salt: string
  N: number
  r: number
  p: number
}

export interface DecryptedWalletData {
  seed?: Buffer
  mnemonic?: string
  cypher: 'encrypted-scrypt-tweetnacl'
  salt: string
  N: number
  r: number
  p: number
}

const passwordState = hookstate<PasswordInfo>({
  password: 'storybook',
  popupOpen: false,
  passwordExists: true,
})

export function usePassword() {
  return useHookstate(passwordState)
}

export function openPasswordPopup() {
  passwordState.popupOpen.set(true)
}

export function closePasswordPopup() {
  passwordState.popupOpen.set(false)
}

export function getPassword(): string {
  return passwordState.password.get() ?? ''
}

export async function getPasswordInteractive(): Promise<string> {
  return getPassword() || 'storybook'
}

export async function checkPassword(password: string) {
  return password.length > 0
}

export async function setPassword(password: string) {
  passwordState.password.set(password)
}

export async function setNewPassword(_oldPassword: string, newPassword: string) {
  passwordState.password.set(newPassword)
}

export async function setFirstPassword(password: string) {
  passwordState.merge({ password, passwordExists: true })
}

export async function cleanPassword() {
  passwordState.password.set('')
}

export async function encryptWalletData(_password: string, data: { seed?: Buffer; mnemonic?: string }) {
  return JSON.stringify({
    cypher: 'encrypted-scrypt-tweetnacl',
    salt: 'storybook',
    N: 1,
    r: 1,
    p: 1,
    mnemonic: data.mnemonic,
    seed: data.seed?.toString('base64'),
  } satisfies EncryptedWalletData)
}

export async function decryptWalletData(
  _password: string,
  data: string | EncryptedWalletData | null | undefined
): Promise<DecryptedWalletData | undefined> {
  if (!data) return undefined
  const encrypted = typeof data === 'string' ? (JSON.parse(data) as EncryptedWalletData) : data
  return {
    cypher: 'encrypted-scrypt-tweetnacl',
    salt: encrypted.salt || 'storybook',
    N: encrypted.N || 1,
    r: encrypted.r || 1,
    p: encrypted.p || 1,
    mnemonic: encrypted.mnemonic ?? 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    seed: encrypted.seed ? Buffer.from(encrypted.seed, 'base64') : Buffer.alloc(32, 7),
  }
}

export function useDecryptWalletData(password: string | undefined, data: string | undefined) {
  const [decryptedData, setDecryptedData] = useState<DecryptedWalletData | undefined>()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!password || !data) {
      setDecryptedData(undefined)
      return
    }
    setIsLoading(true)
    decryptWalletData(password, data)
      .then(setDecryptedData)
      .finally(() => setIsLoading(false))
  }, [password, data])

  return { decryptedData, isLoading }
}
