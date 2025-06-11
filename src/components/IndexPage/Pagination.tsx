import {
  Pagination as PaginationRoot,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import { cn } from '@/utils/cn'
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'

interface PaginationProps {
  currentPage: number
  totalPages: number
  rootClassName?: string
  onPageChange: (page: number) => void
  onPrevious: () => void
  onNext: () => void
}

export function Pagination({
  currentPage,
  totalPages,
  rootClassName,
  onPageChange,
  onPrevious,
  onNext,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }

    if (currentPage <= 4) {
      // Beginning section: 1 2 3 4 5 … last
      pages.push(1, 2, 3, 4, 5, 'ellipsis', totalPages)
    } else if (currentPage >= totalPages - 3) {
      // Ending section: 1 … last-4 last-3 last-2 last-1 last
      pages.push(
        1,
        'ellipsis',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      )
    } else {
      // Middle section: 1 … current-1 current current+1 … last
      pages.push(
        1,
        'ellipsis',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        'ellipsis',
        totalPages
      )
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <PaginationRoot className={cn(rootClassName)}>
      <PaginationContent className="flex items-center space-x-1">
        {/* Previous arrow button */}
        <PaginationItem>
          <PaginationLink
            onClick={(e) => {
              e.preventDefault()
              onPrevious()
            }}
            className={`cursor-pointer w-10 h-10 flex items-center justify-center ${
              currentPage === 1 ? 'pointer-events-none opacity-50' : ''
            }`}
            aria-label="Go to previous page"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </PaginationLink>
        </PaginationItem>

        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis className="w-10 h-10 flex items-center justify-center" />
              </PaginationItem>
            )
          }

          return (
            <PaginationItem key={page}>
              <PaginationLink
                onClick={(e) => {
                  e.preventDefault()
                  onPageChange(page)
                }}
                isActive={currentPage === page}
                className="cursor-pointer w-10 h-10 flex items-center justify-center"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          )
        })}

        {/* Next arrow button */}
        <PaginationItem>
          <PaginationLink
            onClick={(e) => {
              e.preventDefault()
              onNext()
            }}
            className={`cursor-pointer w-10 h-10 flex items-center justify-center ${
              currentPage === totalPages ? 'pointer-events-none opacity-50' : ''
            }`}
            aria-label="Go to next page"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  )
}
