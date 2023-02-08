import React from 'react'

export const BlueButton = React.forwardRef(
  (
    {
      onClick,
      children,
      className,
      disabled,
    }: {
      onClick?: () => void
      children?: any
      className?: string
      disabled?: boolean
    },
    ref
  ) => {
    return (
      <button
        className={' bg-accent rounded px-2 py-2 w-48 text-white ' + className}
        onClick={onClick}
        disabled={disabled}
        ref={ref}
      >
        {children}
      </button>
    )
  }
)
