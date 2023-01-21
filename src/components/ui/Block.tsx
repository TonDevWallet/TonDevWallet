// interface
import clsx from 'clsx'

interface BlockParams extends React.HTMLProps<HTMLDivElement> {
  bg?: string | boolean
}

export function Block({ children, className, bg, ...options }: BlockParams) {
  return (
    <div
      {...options}
      className={clsx(
        className,
        bg || 'dark:bg-foreground/5 bg-background',
        'rounded dark:shadow border dark:border-none p-2'
      )}
    >
      {children}
    </div>
  )
}
