import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHome } from '@fortawesome/free-solid-svg-icons'
import { NavLink } from 'react-router-dom'
import { useMessagesState } from '@/store/connectMessages'

export function HomeLink() {
  const messages = useMessagesState()
  const pendingCount = messages.get().length

  console.log('pendingCount', messages.get({ noproxy: true }))

  const children = (
    <div
      className="rounded-lg px-4 h-8 relative
        flex items-center justify-center text-sm cursor-pointer text-foreground gap-2 hover:bg-muted/50 transition-colors"
    >
      <FontAwesomeIcon icon={faHome} size="xs" className="" />
      <div className="hidden lg:block text-foreground">Home</div>
      {pendingCount > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {pendingCount}
        </div>
      )}
    </div>
  )

  return (
    <NavLink to="/app" className="cursor-pointer rounded flex flex-col items-center my-2">
      {children}
    </NavLink>
  )
}
