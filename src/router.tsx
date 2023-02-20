import React from 'react'
import { createBrowserRouter } from 'react-router-dom'

const IndexPage = React.lazy(() =>
  import('./components/IndexPage/IndexPage').then((module) => ({ default: module.IndexPage }))
)
const NewWalletPage = React.lazy(() =>
  import('./components/NewWalletPage/NewWalletPage').then((module) => ({
    default: module.NewWalletPage,
  }))
)
const WalletPage = React.lazy(() =>
  import('./components/IndexPage/WalletPage').then((module) => ({ default: module.WalletPage }))
)
const Layout = React.lazy(() =>
  import('./components/Layout').then((module) => ({ default: module.Layout }))
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <IndexPage />,
      },
      {
        path: '/new_wallet',
        element: <NewWalletPage />,
      },
      {
        path: '/wallets/:walletId',
        element: <WalletPage />,
      },
    ],
  },
])
