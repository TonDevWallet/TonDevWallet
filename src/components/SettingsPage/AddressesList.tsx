import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useToast } from '../ui/use-toast'
import { AddressBookEntry } from '@/types/address'
import useAddressBook, { formatTonAddress } from '@/hooks/useAddressBook'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '../ui/pagination'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSearch,
  faEdit,
  faTrash,
  faCopy,
  faEllipsisVertical,
} from '@fortawesome/free-solid-svg-icons'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'

interface AddressesListProps {
  networkId: number
  networkName: string
  addressBook: ReturnType<typeof useAddressBook>
}

const PAGE_SIZE = 5

const AddressesList = ({ networkId, networkName, addressBook }: AddressesListProps) => {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [addresses, setAddresses] = useState<AddressBookEntry[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressBookEntry | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingAddress, setDeletingAddress] = useState<AddressBookEntry | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch addresses
  const fetchAddresses = useCallback(async () => {
    try {
      setLoading(true)
      let result

      if (searchQuery.trim()) {
        // If the search query looks like a TON address, try to format it
        let formattedQuery = searchQuery
        if (searchQuery.includes(':') || searchQuery.length > 30) {
          try {
            formattedQuery = formatTonAddress(searchQuery)
          } catch (error) {
            // If formatting fails, just use original query
            console.error('Error formatting search query:', error)
          }
        }

        result = await addressBook.searchAddresses(networkId, formattedQuery, page, PAGE_SIZE)
      } else {
        result = await addressBook.getAddressesPaginated(networkId, page, PAGE_SIZE)
      }

      setAddresses(result.entries)
      setTotalPages(result.totalPages)
      setTotalCount(result.totalCount)

      // If current page is higher than total pages, go to the last page
      if (page > result.totalPages && result.totalPages > 0) {
        setPage(result.totalPages)
      }
    } catch (error) {
      console.error('Error fetching addresses:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch addresses',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [networkId, page, searchQuery, addressBook, toast])

  // Refetch when dependencies change
  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses, networkId, page])

  // Handle search
  const handleSearch = useCallback(() => {
    setPage(1) // Reset to first page
    fetchAddresses()
  }, [fetchAddresses])

  // Handle search input keydown
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch()
      }
    },
    [handleSearch]
  )

  // Copy address to clipboard
  const handleCopyAddress = useCallback(
    (address: string) => {
      navigator.clipboard.writeText(address)
      toast({
        title: 'Address copied',
        description: 'Address has been copied to clipboard',
      })
    },
    [toast]
  )

  // Open edit dialog
  const handleEditClick = useCallback((address: AddressBookEntry) => {
    setEditingAddress(address)
    setEditTitle(address.title)
    setEditDescription(address.description || '')
    setEditDialogOpen(true)
  }, [])

  // Save edited address
  const handleSaveEdit = useCallback(async () => {
    if (!editingAddress) return

    setIsSubmitting(true)

    try {
      const success = await addressBook.updateAddress(editingAddress.address_book_id, {
        title: editTitle,
        description: editDescription,
      })

      if (success) {
        toast({
          title: 'Address updated',
          description: 'Address has been successfully updated',
        })
        setEditDialogOpen(false)
        fetchAddresses() // Refresh the list
      } else {
        toast({
          title: 'Update failed',
          description: 'Failed to update address',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [editingAddress, editTitle, editDescription, addressBook, toast, fetchAddresses])

  // Open delete confirmation dialog
  const handleDeleteClick = useCallback((address: AddressBookEntry) => {
    setDeletingAddress(address)
    setDeleteDialogOpen(true)
  }, [])

  // Delete address
  const handleConfirmDelete = useCallback(async () => {
    if (!deletingAddress) return

    setIsDeleting(true)

    try {
      const success = await addressBook.removeAddress(deletingAddress.address_book_id)

      if (success) {
        toast({
          title: 'Address deleted',
          description: 'Address has been removed from your address book',
        })
        setDeleteDialogOpen(false)
        fetchAddresses() // Refresh the list
      } else {
        toast({
          title: 'Delete failed',
          description: 'Failed to delete address',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }, [deletingAddress, addressBook, toast, fetchAddresses])

  // Generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const numbers: (number | string)[] = []

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        numbers.push(i)
      }
    } else {
      // Always show first and last page
      numbers.push(1)

      if (page <= 3) {
        // Near the start
        numbers.push(2, 3, 4, 5, '...', totalPages)
      } else if (page >= totalPages - 2) {
        // Near the end
        numbers.push(
          '...',
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        )
      } else {
        // In the middle
        numbers.push('...', page - 1, page, page + 1, '...', totalPages)
      }
    }

    return numbers
  }, [page, totalPages])

  // Format address for display
  const formatAddress = useCallback((address: string): string => {
    if (address.length <= 16) return address
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }, [])

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pt-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Saved Addresses</CardTitle>
            <CardDescription>
              {totalCount} {totalCount === 1 ? 'address' : 'addresses'} found for {networkName}
            </CardDescription>
          </div>

          <div className="flex items-center w-full sm:w-auto max-w-sm gap-2">
            <Input
              placeholder="Search addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full"
            />
            <Button variant="outline" size="icon" onClick={handleSearch} disabled={loading}>
              <FontAwesomeIcon icon={faSearch} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {addresses.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addresses.map((addr) => (
                    <TableRow key={addr.address_book_id}>
                      <TableCell className="font-medium">
                        {addr.title || (
                          <span className="text-muted-foreground italic">Untitled</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="secondary"
                                  className="cursor-pointer truncate max-w-48"
                                  onClick={() => handleCopyAddress(addr.address)}
                                >
                                  {formatAddress(addr.address)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Click to copy</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate text-muted-foreground">
                          {addr.description || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <FontAwesomeIcon icon={faEllipsisVertical} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCopyAddress(addr.address)}>
                              <FontAwesomeIcon icon={faCopy} className="mr-2" />
                              Copy Address
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClick(addr)}>
                              <FontAwesomeIcon icon={faEdit} className="mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(addr)}
                              className="text-destructive focus:text-destructive"
                            >
                              <FontAwesomeIcon icon={faTrash} className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (page > 1) setPage(page - 1)
                        }}
                        className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>

                    {pageNumbers.map((pageNum, index) => (
                      <PaginationItem key={index}>
                        {pageNum === '...' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (typeof pageNum === 'number') {
                                setPage(pageNum)
                              }
                            }}
                            isActive={page === pageNum}
                          >
                            {pageNum}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (page < totalPages) setPage(page + 1)
                        }}
                        className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            {loading ? (
              <p className="text-muted-foreground">Loading addresses...</p>
            ) : searchQuery ? (
              <p className="text-muted-foreground">No addresses found matching your search query</p>
            ) : (
              <p className="text-muted-foreground">No addresses saved yet</p>
            )}
          </div>
        )}
      </CardContent>

      {/* Edit Address Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Address</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="address-display">Address</Label>
              <Input
                id="address-display"
                value={editingAddress?.address || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="E.g. My Wallet, Exchange, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional notes about this address"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Address</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p>Are you sure you want to delete this address?</p>
            {deletingAddress && (
              <div className="mt-2">
                <p className="font-medium">{deletingAddress.title || 'Untitled'}</p>
                <p className="text-muted-foreground text-sm break-all">{deletingAddress.address}</p>
              </div>
            )}
            <p className="mt-4 text-destructive">This action cannot be undone.</p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default AddressesList
