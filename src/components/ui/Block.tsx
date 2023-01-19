// interface

export function Block({ children, className, ...options }: React.HTMLProps<HTMLDivElement>) {
  return (
    <div
      {...options}
      className={
        'dark:bg-foreground-element/5 bg-background \
      rounded dark:shadow border-2 dark:border-none p-2 ' + className
      }
    >
      {children}
    </div>
  )
}
