// interface
import { cn } from '@/utils/cn'

interface BlockParams extends React.HTMLProps<HTMLDivElement> {
  bg?: string | boolean
}

export function Block({ children, className, bg, ...options }: BlockParams) {
  return (
    <div {...options} className={cn(bg, 'rounded-xl dark:shadow border p-4', className)}>
      {children}
    </div>
  )
}
