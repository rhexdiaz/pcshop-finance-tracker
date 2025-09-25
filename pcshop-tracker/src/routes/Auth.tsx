import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { cx, styles as s } from '../ui'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Authentication error')
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    if (!email) return alert('Enter your email first')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (error) alert(error.message)
    else alert('Check your email for the reset link.')
  }

  return (
    <div className="min-h-dvh grid place-items-center bg-gradient-to-b from-indigo-50 to-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 text-center">
          <div className="text-xs tracking-widest text-indigo-600">WELCOME</div>
          <h1 className="mt-1 text-2xl font-semibold">{import.meta.env.VITE_APP_NAME || 'PC Shop Finance'}</h1>
          <p className="mt-1 text-sm text-slate-600">Sign in to continue</p>
        </div>

        {error && (
          <div className={cx(s.alert, 'mb-3 border-rose-200 bg-rose-50 text-rose-700')}>
            {error}
          </div>
        )}

        <form onSubmit={signIn} className={cx(s.card, 'p-6 space-y-3')}>
          <div>
            <label className="text-sm text-slate-600">Email</label>
            <input
              className={s.input}
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="you@shop.com"
              required
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">Password</label>
            <div className="relative">
              <input
                className={s.input}
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={()=>setShowPw(v=>!v)}
                className="absolute inset-y-0 right-2 my-1 rounded-md px-2 text-xs text-slate-600 hover:bg-slate-100"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button disabled={busy} className={cx(s.btn, s.primary, 'w-full')}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <span className="text-slate-500">No account? Ask an <span className="font-medium">Admin</span>.</span>
            <button type="button" className="underline" onClick={reset}>Forgot password?</button>
          </div>
        </form>
      </div>
    </div>
  )
}
