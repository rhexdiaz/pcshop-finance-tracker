import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { cx, styles as s } from '../ui'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetMsg, setResetMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResetMsg(null)
    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // success: session is set and Root will render the app
    } catch (err: any) {
      setError(err?.message || 'Authentication error')
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    setError(null)
    setResetMsg(null)
    if (!email) {
      setError('Enter your email first.')
      return
    }

    // Use a stable base URL (works both locally and on Vercel if VITE_SITE_URL is set)
    const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin
    const redirectTo = `${SITE_URL}/set-password?from=reset`

    try {
      setBusy(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      setResetMsg('If this email exists, we sent a reset link. Please check your inbox.')
    } catch (e: any) {
      setError(e?.message || 'Could not send reset email.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center bg-gradient-to-b from-indigo-50 to-slate-50 px-4">
      <div className="w-full max-w-sm sm:max-w-md">
        {/* Brand / Intro */}
        <div className="mb-4 text-center">
          <div className="text-xs tracking-widest text-indigo-600">WELCOME</div>
          <h1 className="mt-1 text-2xl font-semibold">
            {import.meta.env.VITE_APP_NAME || 'PC Shop Finance'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">Sign in to continue</p>
        </div>

        {/* Messages */}
        {error && (
          <div className={cx(s.alert, 'mb-3 border-rose-200 bg-rose-50 text-rose-700')} role="alert" aria-live="polite">
            {error}
          </div>
        )}
        {resetMsg && (
          <div className={cx(s.alert, 'mb-3 border-emerald-200 bg-emerald-50 text-emerald-800')} role="status" aria-live="polite">
            {resetMsg}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={signIn}
          className={cx(s.card, 'p-5 sm:p-6 space-y-3')}
          aria-busy={busy}
        >
          <div>
            <label htmlFor="email" className="text-sm text-slate-600">Email</label>
            <input
              id="email"
              className={s.input}
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="you@shop.com"
              required
              disabled={busy}
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm text-slate-600">Password</label>
            <div className="relative">
              <input
                id="password"
                className={s.input}
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={busy}
              />
              <button
                type="button"
                onClick={()=>setShowPw(v=>!v)}
                className="absolute inset-y-0 right-2 my-1 rounded-md px-2 text-xs text-slate-600 hover:bg-slate-100"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                disabled={busy}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button disabled={busy} className={cx(s.btn, s.primary, 'w-full')}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-center">
            <span className="text-center sm:text-left text-sm text-slate-600">
              No account? Ask an <span className="font-medium">Admin</span>.
            </span>
            <button
              type="button"
              className="text-sm underline"
              onClick={reset}
              disabled={busy}
            >
              Forgot password?
            </button>
          </div>
        </form>

        {/* Footer hint */}
        <p className="mt-3 text-center text-xs text-slate-500">
          Tip: you can use the reset link to set a new password anytime.
        </p>
      </div>
    </div>
  )
}
