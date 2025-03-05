import { useState, useCallback } from 'react'
import { AddressBookEntry } from '@/types/address'
import { getDatabase } from '@/db'
import { Address } from '@ton/core'

export interface AddressBookPaginationResult {
  entries: AddressBookEntry[]
  totalCount: number
  totalPages: number
  currentPage: number
}

export interface UseAddressBookResult {
  loading: boolean
  getAllAddresses: (networkId: number) => Promise<AddressBookEntry[]>
  getAddressesPaginated: (
    networkId: number,
    page?: number,
    pageSize?: number
  ) => Promise<AddressBookPaginationResult>
  getAddressById: (addressBookId: number) => Promise<AddressBookEntry | null>
  addAddress: (
    networkId: number,
    address: string,
    title: string,
    description: string
  ) => Promise<number> // Returns the id of the newly created address entry
  updateAddress: (
    addressBookId: number,
    updates: Partial<Omit<AddressBookEntry, 'address_book_id' | 'network_id' | 'created_at'>>
  ) => Promise<boolean>
  removeAddress: (addressBookId: number) => Promise<boolean>
  searchAddresses: (
    networkId: number,
    query: string,
    page?: number,
    pageSize?: number
  ) => Promise<AddressBookPaginationResult>
}

/**
 * Formats a TON address to a consistent format
 */
export function formatTonAddress(address: string): string {
  // Remove all whitespace
  const formattedAddress = address.replace(/\s+/g, '')

  return Address.parse(formattedAddress).toString({ bounceable: true, urlSafe: true })
}

export function useAddressBook(): UseAddressBookResult {
  const [loading, setLoading] = useState(false)

  // Get all addresses for a specific network
  const getAllAddresses = useCallback(async (networkId: number): Promise<AddressBookEntry[]> => {
    try {
      setLoading(true)
      const db = await getDatabase()
      const addresses = await db<AddressBookEntry>('address_book')
        .where('network_id', networkId)
        .orderBy('created_at', 'desc')

      return addresses
    } catch (error) {
      console.error('Error fetching addresses:', error)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Get addresses with pagination
  const getAddressesPaginated = useCallback(
    async (networkId: number, page = 1, pageSize = 10): Promise<AddressBookPaginationResult> => {
      try {
        setLoading(true)
        const db = await getDatabase()

        // Get total count
        const countResult = await db('address_book')
          .where('network_id', networkId)
          .count('address_book_id as count')
          .first()

        const totalCount = countResult ? (countResult.count as number) : 0
        const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
        const currentPage = Math.min(Math.max(1, page), totalPages)

        // Calculate offset
        const offset = (currentPage - 1) * pageSize

        // Get paginated data
        const entries = await db<AddressBookEntry>('address_book')
          .where('network_id', networkId)
          .orderBy('created_at', 'desc')
          .limit(pageSize)
          .offset(offset)

        return {
          entries,
          totalCount,
          totalPages,
          currentPage,
        }
      } catch (error) {
        console.error('Error fetching paginated addresses:', error)
        return {
          entries: [],
          totalCount: 0,
          totalPages: 1,
          currentPage: 1,
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Get a specific address by ID
  const getAddressById = useCallback(
    async (addressBookId: number): Promise<AddressBookEntry | null> => {
      try {
        setLoading(true)
        const db = await getDatabase()
        const address = await db<AddressBookEntry>('address_book')
          .where('address_book_id', addressBookId)
          .first()

        return address || null
      } catch (error) {
        console.error('Error fetching address by ID:', error)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Add a new address
  const addAddress = useCallback(
    async (
      networkId: number,
      address: string,
      title: string,
      description: string
    ): Promise<number> => {
      try {
        setLoading(true)
        const db = await getDatabase()

        if (!address.trim()) {
          throw new Error('Address cannot be empty')
        }

        // Format the address to a consistent format
        const formattedAddress = formatTonAddress(address)

        const [addressBookId] = await db<AddressBookEntry>('address_book').insert({
          network_id: networkId,
          address: formattedAddress,
          title: title.trim() || 'Untitled',
          description: description.trim() || null,
          created_at: Date.now(),
        })

        return addressBookId
      } catch (error) {
        console.error('Error adding address:', error)
        return 0
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Update an address
  const updateAddress = useCallback(
    async (
      addressBookId: number,
      updates: Partial<Omit<AddressBookEntry, 'address_book_id' | 'network_id' | 'created_at'>>
    ): Promise<boolean> => {
      try {
        setLoading(true)
        const db = await getDatabase()

        // Clean up updates object
        const cleanUpdates: Record<string, any> = {}

        if (updates.address !== undefined) {
          cleanUpdates.address = formatTonAddress(updates.address)
        }

        if (updates.title !== undefined) {
          cleanUpdates.title = updates.title.trim() || 'Untitled'
        }

        if (updates.description !== undefined) {
          cleanUpdates.description = updates.description ? updates.description.trim() || null : null
        }

        const updated = await db<AddressBookEntry>('address_book')
          .where('address_book_id', addressBookId)
          .update(cleanUpdates)

        return updated > 0
      } catch (error) {
        console.error('Error updating address:', error)
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Remove an address
  const removeAddress = useCallback(async (addressBookId: number): Promise<boolean> => {
    try {
      setLoading(true)
      const db = await getDatabase()

      const deleted = await db<AddressBookEntry>('address_book')
        .where('address_book_id', addressBookId)
        .delete()

      return deleted > 0
    } catch (error) {
      console.error('Error removing address:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // Search addresses
  const searchAddresses = useCallback(
    async (
      networkId: number,
      query: string,
      page = 1,
      pageSize = 10
    ): Promise<AddressBookPaginationResult> => {
      try {
        setLoading(true)
        const db = await getDatabase()

        if (!query.trim()) {
          return getAddressesPaginated(networkId, page, pageSize)
        }

        const searchQuery = `%${query.trim().toLowerCase()}%`

        // Get total count for search
        const countResult = await db('address_book')
          .where('network_id', networkId)
          .where((builder) => {
            builder
              .whereRaw('LOWER(address) LIKE ?', [searchQuery])
              .orWhereRaw('LOWER(title) LIKE ?', [searchQuery])
              .orWhereRaw('LOWER(description) LIKE ?', [searchQuery])
          })
          .count('address_book_id as count')
          .first()

        const totalCount = countResult ? (countResult.count as number) : 0
        const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
        const currentPage = Math.min(Math.max(1, page), totalPages)

        // Calculate offset
        const offset = (currentPage - 1) * pageSize

        // Get paginated search results
        const entries = await db<AddressBookEntry>('address_book')
          .where('network_id', networkId)
          .where((builder) => {
            builder
              .whereRaw('LOWER(address) LIKE ?', [searchQuery])
              .orWhereRaw('LOWER(title) LIKE ?', [searchQuery])
              .orWhereRaw('LOWER(description) LIKE ?', [searchQuery])
          })
          .orderBy('created_at', 'desc')
          .limit(pageSize)
          .offset(offset)

        return {
          entries,
          totalCount,
          totalPages,
          currentPage,
        }
      } catch (error) {
        console.error('Error searching addresses:', error)
        return {
          entries: [],
          totalCount: 0,
          totalPages: 1,
          currentPage: 1,
        }
      } finally {
        setLoading(false)
      }
    },
    [getAddressesPaginated]
  )

  return {
    loading,
    getAllAddresses,
    getAddressesPaginated,
    getAddressById,
    addAddress,
    updateAddress,
    removeAddress,
    searchAddresses,
  }
}

export default useAddressBook
