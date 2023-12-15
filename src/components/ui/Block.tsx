// interface
import { cn } from '@/utils/cn'

interface BlockParams extends React.HTMLProps<HTMLDivElement> {
  bg?: string | boolean
}

export function Block({ children, className, bg, ...options }: BlockParams) {
  return (
    <div
      {...options}
      className={cn(
        bg || 'dark:bg-foreground/5 bg-background',
        'rounded dark:shadow border dark:border-none p-2',
        className
      )}
    >
      {children}
    </div>
  )
}
