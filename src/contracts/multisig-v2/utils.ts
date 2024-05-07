import { Address } from '@ton/core'
// import { sendToIndex } from './MyNetworkProvider'

export interface AddressInfo {
  isBounceable: boolean
  isTestOnly: boolean
  address: Address
}

export const validateUserFriendlyAddress = (s: string, isTestnet: boolean): string | null => {
  if (Address.isFriendly(s)) {
    const address = Address.parseFriendly(s)
    if (address.isTestOnly && !isTestnet) {
      return 'Please enter mainnet address'
    } else {
      return null
    }
  } else {
    return 'Invalid address'
  }
}

export const explorerUrl = (address: string, isTestnet: boolean) => {
  Address.parseFriendly(address) // check validity
  return (isTestnet ? 'https://testnet.tonviewer.com/' : 'https://tonviewer.com/') + address
}

// const addressCache: { [key: string]: string } = {}

// export const getAddressFormat = async (
//   address: Address,
//   isTestnet: boolean
// ): Promise<AddressInfo> => {
//   const raw = address.toRawString()

//   let friendly = addressCache[raw]
//   if (!friendly) {
//     const result = await sendToIndex('addressBook', { address: raw }, isTestnet)
//     friendly = result[raw].user_friendly
//     addressCache[raw] = friendly
//   }

//   return Address.parseFriendly(friendly)
// }

// export const formatAddressAndUrl = async (address: Address, isTestnet: boolean) => {
//   const f = await getAddressFormat(address, isTestnet)
//   return makeAddressLink(f)
// }

export const makeAddressLink = (address: AddressInfo) => {
  const addressString = addressToString(address)
  const url = explorerUrl(addressString, address.isTestOnly)
  return `<a href="${url}" target="_blank">${addressString}</a>`
}

export const addressToString = (address: AddressInfo) => {
  return address.address.toString({
    bounceable: address.isBounceable,
    testOnly: address.isTestOnly,
  })
}

export const equalsMsgAddresses = (a: Address | null, b: Address | null) => {
  if (!a) return !b
  if (!b) return !a
  return a.equals(b)
}

export const equalsAddressLists = (a: Address[], b: Address[]) => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!a[i].equals(b[i])) return false
  }
  return true
}

export const assert = (condition: boolean, error: string) => {
  if (!condition) {
    console.error(error)
    throw new Error(error)
  }
}

export const sanitizeHTML = (text: string): string => {
  const d = document.createElement('div')
  d.innerText = text
  return d.innerHTML
}
