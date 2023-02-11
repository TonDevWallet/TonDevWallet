import { getDatabase } from '@/db'
import { hookstate, useHookstate } from '@hookstate/core'
import { useEffect, useState } from 'react'
import { scrypt } from 'scrypt-js'
import nacl from 'tweetnacl'
import { subscribable } from '@hookstate/subscribable'
import { Setting } from '@/types/settings'
import { Key } from '@/types/Key'
import { updateWalletsList } from './walletsListState'

export interface PasswordInfo {
  password?: string
  passwordExists: boolean

  popupOpen: boolean
}

export interface EncryptedWalletData {
  seed?: string // base64 + box
  mnemonic?: string // string + box

  cypher: 'encrypted-scrypt-tweetnacl'
  salt: string // base64
  N: number
  r: number
  p: number
}

export interface DecryptedWalletData {
  seed?: Buffer // base64 + box
  mnemonic?: string // string + box

  cypher: 'encrypted-scrypt-tweetnacl'
  salt: string // base64
  N: number
  r: number
  p: number
}

interface SensitiveWalletData {
  seed?: Buffer // base64 + box
  mnemonic?: string // string + box
}

const defaultScryptSettings = {
  N: 16384, // 16K*128*8 = 16 Mb of memory
  r: 8,
  p: 1,
}

const passwordState = hookstate(async () => {
  const db = await getDatabase()
  const exists = await db('settings').where({ name: 'password' }).first()
  return {
    password: '',
    popupOpen: false,
    passwordExists: !!exists,
  }
}, subscribable())

export function usePassword() {
  return useHookstate(passwordState)
}

export function openPasswordPopup() {
  passwordState.popupOpen.set(true)
}

export function closePasswordPopup() {
  passwordState.popupOpen.set(false)
}

// This function opens password popup and returns password if user unlocked it
export async function getPasswordInteractive(): Promise<string> {
  const existing = passwordState.password.get()
  if (existing) {
    return existing
  }

  openPasswordPopup()

  return new Promise<string>((resolve, reject) => {
    let cleanup = () => {
      // nothing
    }
    const unsubPass = passwordState.password.subscribe(() => {
      cleanup()
    })
    const unsubOpen = passwordState.popupOpen.subscribe(() => {
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
}

export async function checkPassword(password: string) {
  const db = await getDatabase()
  const existingPasword = await db<{ name: string; value: string }>('settings')
    .where('name', 'password')
    .first()

  if (!existingPasword) {
    throw new Error('Password not exists')
  }

  const [sSalt, sKey] = existingPasword.value.split(':')
  const salt = Buffer.from(sSalt, 'base64')
  const key = Buffer.from(sKey, 'base64')

  const enc = Buffer.from(
    await scrypt(
      Buffer.from(password, 'utf8'),
      salt,
      defaultScryptSettings.N,
      defaultScryptSettings.r,
      defaultScryptSettings.p,
      32
    )
  )

  if (!enc.equals(key)) {
    return false
  }

  return true
}

export async function setPassword(password: string) {
  const passwordOk = await checkPassword(password)
  if (!passwordOk) {
    throw new Error('Password not match')
  }

  passwordState.password.set(password)
}

export async function setNewPassword(oldPassword: string, newPassword: string) {
  const passwordOk = await checkPassword(oldPassword)
  if (!passwordOk) {
    throw new Error('Old Password not ok')
  }

  const database = await getDatabase()
  const tx = await database.transaction()
  try {
    const salt = Buffer.from(nacl.randomBytes(32))
    const key = Buffer.from(
      await scrypt(
        Buffer.from(newPassword, 'utf8'),
        salt,
        defaultScryptSettings.N,
        defaultScryptSettings.r,
        defaultScryptSettings.p,
        32
      )
    )
    await tx<Setting>('settings')
      .where({ name: 'password' })
      .update({
        value: `${salt.toString('base64')}:${key.toString('base64')}`,
      })

    const walletKeys = await tx<Key>('keys').select()
    for (const key of walletKeys) {
      const decrypted = await decryptWalletData(oldPassword, key.encrypted)
      const encrypted = await encryptWalletData(newPassword, decrypted)

      await tx<Key>('keys').where({ id: key.id }).update({ encrypted })
      console.log('updating', key, encrypted)
    }

    await tx.commit()

    console.log('set new password', newPassword)
    passwordState.password.set(newPassword)
    updateWalletsList()
  } finally {
    if (!tx.isCompleted()) {
      await tx.rollback()
    }
  }
}

export async function setFirstPassword(password: string) {
  const db = await getDatabase()

  const salt = Buffer.from(nacl.randomBytes(32))
  const key = Buffer.from(
    await scrypt(
      Buffer.from(password, 'utf8'),
      salt,
      defaultScryptSettings.N,
      defaultScryptSettings.r,
      defaultScryptSettings.p,
      32
    )
  )
  await db<Setting>('settings').insert({
    name: 'password',
    value: `${salt.toString('base64')}:${key.toString('base64')}`,
  })
  passwordState.password.set(password)
  passwordState.passwordExists.set(true)
}

export async function cleanPassword() {
  passwordState.password.set('')
}

export async function encryptWalletData(password: string, data: SensitiveWalletData) {
  const salt = Buffer.from(await nacl.randomBytes(32))
  const enckey = await scrypt(
    Buffer.from(password, 'utf8'),
    salt,
    defaultScryptSettings.N,
    defaultScryptSettings.r,
    defaultScryptSettings.p,
    32
  )
  const nonce = salt.slice(0, 24)

  const encrypted: EncryptedWalletData = {
    cypher: 'encrypted-scrypt-tweetnacl',
    N: defaultScryptSettings.N,
    p: defaultScryptSettings.p,
    r: defaultScryptSettings.r,
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
  console.log('decrypting', password)
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
    console.log('mnemonic:', encrypted.mnemonic)
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
): {
  decryptedData: DecryptedWalletData | undefined
  isLoading: boolean
} {
  const [decryptedData, setDecryptedData] = useState<DecryptedWalletData | undefined>()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setDecryptedData(undefined)
    if (!password || !data) {
      return
    }

    setIsLoading(true)
    decryptWalletData(password, data)
      .then(setDecryptedData)
      .finally(() => {
        setIsLoading(false)
      })
  }, [password, data])

  return { decryptedData, isLoading }
}
