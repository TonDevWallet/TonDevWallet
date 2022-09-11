export function BlueButton({
  onClick,
  children,
  className,
  disabled,
}: {
  onClick?: () => void
  children?: any
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      className={className + ' bg-highlight rounded px-2 py-2 w-48 text-white'}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
