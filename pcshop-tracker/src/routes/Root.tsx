import { Link, NavLink, Outlet } from 'react-router-dom'
import { useSession } from '../lib/session'
import { supabase } from '../lib/supabaseClient'
import { cx, styles as s } from '../ui'

export default function Root() {
  const { session, profile } = useSession()
  const isAdmin = profile?.role === 'admin'

  const displayName =
    profile?.full_name ||
    ((session?.user?.user_metadata as Record<string, any> | undefined)?.full_name ?? session?.user?.email ?? '')

  const nav = [
    { to: '/', label: 'Dashboard' },
    { to: '/transactions', label: 'Transactions' },
    { to: '/bills', label: 'Bills' },
    { to: '/savings', label: 'Savings' },
  ]

  return (
    <div className="min-h-dvh text-slate-900">
      {/* Brand header */}
      <div className="bg-gradient-to-r from-indigo-600 via-sky-600 to-violet-600 text-white shadow">
        <header className="mx-auto max-w-5xl px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="font-semibold tracking-tight">
            {import.meta.env.VITE_APP_NAME || 'PC Shop Finance'}
          </Link>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  cx(
                    'rounded-xl px-3 py-1 transition ring-1',
                    isActive
                      ? 'bg-white/15 ring-white/30'
                      : 'hover:bg-white/10 ring-white/20'
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
                    'rounded-xl px-3 py-1 transition ring-1',
                    isActive
                      ? 'bg-white/15 ring-white/30'
                      : 'hover:bg-white/10 ring-white/20'
                  )
                }
              >
                Invite
              </NavLink>
            )}

            <span className="ml-2 rounded-full bg-white/10 px-3 py-1 text-white/90 ring-1 ring-white/20">
              {displayName}
              {profile?.role && (
                <span className="ml-2 rounded bg-white/15 px-2 py-0.5 text-xs uppercase tracking-wide">
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
      </div>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-6">
        <Outlet />
      </main>

      <footer className="py-8 text-center text-xs text-slate-500">
        Developed by Rhex Diaz
      </footer>
    </div>
  )
}
