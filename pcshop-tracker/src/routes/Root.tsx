import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useSession } from '../lib/session'
import { supabase } from '../lib/supabaseClient'
import { cx, styles as s } from '../ui'

export default function Root() {
  const { session, profile } = useSession()
  const isAdmin = profile?.role === 'admin'
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false) // mobile menu

  // close menu on route change
  useEffect(() => setOpen(false), [pathname])

  const displayName =
    profile?.full_name ||
    ((session?.user?.user_metadata as Record<string, any> | undefined)?.full_name ??
      session?.user?.email ??
      '')

  const nav = [
    { to: '/', label: 'Dashboard' },
    { to: '/transactions', label: 'Transactions' },
    { to: '/bills', label: 'Bills' },
    { to: '/savings', label: 'Savings' },
    { to: '/reports', label: 'Reports' },
  ]

  const NavBtn = ({ to, label }: { to: string; label: string }) => (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cx(
          'rounded-xl px-3 py-1 text-sm transition ring-1',
          isActive ? 'bg-white/15 ring-white/30' : 'hover:bg-white/10 ring-white/20'
        )
      }
    >
      {label}
    </NavLink>
  )

  return (
    <div className="min-h-dvh text-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-indigo-600 via-sky-600 to-violet-600 text-white shadow">
        <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          {/* Left: brand + hamburger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Open menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10 md:hidden"
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <Link to="/" className="font-semibold tracking-tight">
              {import.meta.env.VITE_APP_NAME || 'PCShop Finance Tracker'}
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 md:flex">
            {nav.map((n) => (
              <NavBtn key={n.to} to={n.to} label={n.label} />
            ))}
            {isAdmin && <NavBtn to="/admin/invite" label="Invite" />}

            <span className="ml-2 hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-white/90 ring-1 ring-white/20 md:inline-flex">
              {displayName || 'Account'}
              {profile?.role && (
                <span className="rounded bg-white/15 px-2 py-0.5 text-xs uppercase tracking-wide">
                  {profile.role}
                </span>
              )}
            </span>

            <button
              onClick={() => supabase.auth.signOut()}
              className={cx(s.btn, 'bg-white text-indigo-700 hover:bg-white/90 focus:ring-4 focus:ring-white/40')}
            >
              Logout
            </button>
          </nav>
        </header>

        {/* Mobile drawer */}
        <div className={cx('border-t border-white/10 md:hidden', open ? 'block' : 'hidden')}>
          <div className="mx-auto max-w-5xl px-4 pb-3">
            <nav className="grid gap-1">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === '/'}
                  className={({ isActive }) =>
                    cx(
                      'rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10',
                      isActive && 'bg-white/15 ring-1 ring-white/30'
                    )
                  }
                >
                  {n.label}
                </NavLink>
              ))}

              {isAdmin && (
                <NavLink
                  to="/admin/invite"
                  className={({ isActive }) =>
                    cx(
                      'rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10',
                      isActive && 'bg-white/15 ring-1 ring-white/30'
                    )
                  }
                >
                  Invite
                </NavLink>
              )}

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/10 px-3 py-2 text-xs">
                  <div className="font-medium">{displayName || 'Account'}</div>
                  {profile?.role && <div className="opacity-80">Role: {profile.role}</div>}
                </div>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-indigo-700 shadow-sm"
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-6">
        <Outlet />
      </main>

      <footer className="py-8 text-center text-xs text-slate-500">Developed by Rhex Diaz</footer>
    </div>
  )
}
