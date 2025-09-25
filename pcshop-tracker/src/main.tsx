import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'

import { SessionProvider, useSession } from './lib/session'
import Root from './routes/Root'
import Dashboard from './routes/Dashboard'
import Transactions from './routes/Transactions'
import Bills from './routes/Bills'
import Savings from './routes/Savings'
import AdminInvite from './routes/AdminInvite'
import Auth from './routes/Auth' 
import Reports from './routes/Reports' 
import SetPassword from './routes/SetPassword'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'transactions', element: <Transactions /> },
      { path: 'bills', element: <Bills /> },
      { path: 'savings', element: <Savings /> },
      { path: 'reports', element: <Reports /> },
      { path: 'admin/invite', element: <AdminInvite /> }, // admin-only UI (component checks role)
      { path: 'set-password', element: <SetPassword /> },
    ],
  },
])

function App() {
  const { session, loading } = useSession()
  if (loading) return <div className="min-h-dvh grid place-items-center">Loading…</div>
  if (!session) return <Auth />
  return <RouterProvider router={router} />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </React.StrictMode>
)
