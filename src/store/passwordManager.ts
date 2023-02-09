import { getDatabase } from '@/db'
import { hookstate, useHookstate } from '@hookstate/core'
import { useEffect, useState } from 'react'
import { scrypt } from 'scrypt-js'
import nacl from 'tweetnacl'
import { subscribable } from '@hookstate/subscribable'

export interface PasswordInfo {
  password?: string

  popupOpen: boolean
}

export interface EncryptedWalletData {
  seed?: string // base64 + box
  mnemonic?: string // string + box

  cypher: 'encrypted-scrypt-tweetnacl'
  salt: string // base64
  N: number
  r: 8
  p: 1
}

interface DecryptedWalletData {
  seed?: Buffer // base64 + box
  mnemonic?: string // string + box

  cypher: 'encrypted-scrypt-tweetnacl'
  salt: string // base64
  N: number
  r: 8
  p: 1
}

interface SensitiveWalletData {
  seed?: Buffer // base64 + box
  mnemonic?: string // string + box
}

const passwordState = hookstate(
  {
    password: '',
    popupOpen: false,
  },
  subscribable()
)

export function usePassword() {
  return useHookstate(passwordState)
}

export function openPasswordPopup() {
  passwordState.popupOpen.set(true)
}

export function closePasswordPopup() {
  passwordState.popupOpen.set(false)
}

export async function getPasswordInteractive(): Promise<string> {
  const existing = passwordState.password.get()
  if (existing) {
    return existing
  }

  openPasswordPopup()

  return new Promise<string>((resolve, reject) => {
    // const subState = (passwordState)
    let cleanup = () => {
      // nothing
    }
    const unsubPass = passwordState.password.subscribe((e) => {
      console.log('password sub', e)
      cleanup()
    })
    const unsubOpen = passwordState.popupOpen.subscribe((e) => {
      console.log('popup sub', e)
      cleanup()
    })
    cleanup = () => {
      unsubPass()
      unsubOpen()

      if (passwordState.password) {
        resolve(passwordState.password.get())
      } else {
        reject(new Error('No password'))
      }
    }
  })

  // subscribable()
  // passwordState.

  // throw new Error('no password for now')
}

export async function setPassword(password: string) {
  // scrypt()
  const N = 16384 // 16K*128*8 = 16 Mb of memory
  const r = 8
  const p = 1

  const db = await getDatabase()
  const existingPasword = await db<{ name: string; value: string }>('settings')
    .where('name', 'password')
    .first()

  if (!existingPasword) {
    const salt = Buffer.from(nacl.randomBytes(32))
    const key = Buffer.from(await scrypt(Buffer.from(password, 'utf8'), salt, N, r, p, 32))

    await db<{ name: string; value: string }>('settings').insert({
      name: 'password',
      value: `${salt.toString('base64')}:${key.toString('base64')}`,
    })

    passwordState.password.set(password)
    return
  }

  const [sSalt, sKey] = existingPasword.value.split(':')
  const salt = Buffer.from(sSalt, 'base64')
  const key = Buffer.from(sKey, 'base64')

  const enc = Buffer.from(await scrypt(Buffer.from(password, 'utf8'), salt, N, r, p, 32))

  if (!enc.equals(key)) {
    throw new Error('Password not match')
  }

  passwordState.password.set(password)
}

export async function cleanPassword() {
  passwordState.password.set('')
}

export async function encryptWalletData(password: string, data: SensitiveWalletData) {
  // default parameters
  const N = 16384 // 16K*128*8 = 16 Mb of memory
  const r = 8
  const p = 1

  const salt = Buffer.from(await nacl.randomBytes(32))
  const enckey = await scrypt(Buffer.from(password, 'utf8'), salt, N, r, p, 32)
  const nonce = salt.slice(0, 24)

  const encrypted: EncryptedWalletData = {
    cypher: 'encrypted-scrypt-tweetnacl',
    N,
    p,
    r,
    salt: salt.toString('base64'),
  }

  if (data.mnemonic) {
    encrypted.mnemonic = Buffer.from(
      nacl.secretbox(
        Uint8Array.from(Buffer.from(data.mnemonic, 'utf8')),
        Uint8Array.from(nonce),
        Uint8Array.from(enckey)
      )
    ).toString('base64')
  }

  if (data.seed) {
    encrypted.seed = Buffer.from(
      nacl.secretbox(Uint8Array.from(data.seed), Uint8Array.from(nonce), Uint8Array.from(enckey))
    ).toString('base64')
  }

  return JSON.stringify(encrypted)
}

export async function decryptWalletData(
  password: string,
  data: string | EncryptedWalletData
): Promise<DecryptedWalletData> {
  const encrypted = typeof data === 'string' ? (JSON.parse(data) as EncryptedWalletData) : data
  if (!encrypted.N || !encrypted.p || !encrypted.r || !encrypted.salt) {
    throw new Error('Unknown box')
  }

  if (encrypted.cypher !== 'encrypted-scrypt-tweetnacl') {
    throw new Error('Unknown cypher')
  }

  const N = encrypted.N
  const r = encrypted.r
  const p = encrypted.p

  const salt = Buffer.from(encrypted.salt, 'base64')
  const enckey = await scrypt(Buffer.from(password, 'utf8'), salt, N, r, p, 32)
  const nonce = salt.slice(0, 24)

  const result: DecryptedWalletData = {
    cypher: 'encrypted-scrypt-tweetnacl',
    N: encrypted.N,
    p: encrypted.p,
    r: encrypted.r,
    salt: encrypted.salt,
  }

  if (encrypted.mnemonic) {
    const inside = nacl.secretbox.open(Buffer.from(encrypted.mnemonic, 'base64'), nonce, enckey)
    if (!inside) {
      throw new Error("Can't open box")
    }

    result.mnemonic = Buffer.from(inside).toString('utf-8')
  }

  if (encrypted.seed) {
    const inside = nacl.secretbox.open(Buffer.from(encrypted.seed, 'base64'), nonce, enckey)
    if (!inside) {
      throw new Error("Can't open box")
    }

    result.seed = Buffer.from(inside)
  }

  return result
}

export function useDecryptWalletData(
  password: string | undefined,
  data: string | undefined
): DecryptedWalletData | undefined {
  const [decryptedData, setDecryptedData] = useState<DecryptedWalletData | undefined>()

  useEffect(() => {
    setDecryptedData(undefined)
    if (!password || !data) {
      return
    }

    decryptWalletData(password, data).then(setDecryptedData)
  }, [password, data])

  return decryptedData
}
