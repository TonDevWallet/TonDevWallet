export function BlueButton({
  onClick,
  children,
  className,
}: {
  onClick?: () => void
  children?: any
  className?: string
}) {
  return (
    <button
      className={className + ' bg-highlight rounded px-2 py-2 w-48 text-white'}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
