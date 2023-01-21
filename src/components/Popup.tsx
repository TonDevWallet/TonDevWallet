import Popup from 'reactjs-popup'
import { PopupProps } from 'reactjs-popup/dist/types'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export interface LocalPopupProps extends PopupProps {
  children: React.ReactNode | ((close: () => void) => React.ReactNode)
}

export function ReactPopup({ children, ...options }: LocalPopupProps) {
  return <Popup {...options}>{children as React.ReactNode}</Popup>
}
