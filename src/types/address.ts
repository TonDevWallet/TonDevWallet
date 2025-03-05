export interface AddressBookEntry {
  address_book_id: number
  network_id: number
  address: string
  title: string
  description: string | null
  created_at: number
}
