import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { styles as s, cx } from '../ui'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function SetPassword() {
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [show1, setShow1] = useState(false)
  const [show2, setShow2] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    // Ensure session exists (invite/reset links set it from URL hash)
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setError('Your session is missing or expired. Please open the invite or reset link again, or sign in.')
      }
    })
  }, [])

  const validation = useMemo(() => {
    const issues: string[] = []
    if (pw1.length && pw1.length < 8) issues.push('At least 8 characters')
    if (pw1 && pw2 && pw1 !== pw2) issues.push('Passwords must match')
    return { ok: pw1.length >= 8 && pw1 === pw2, issues }
  }, [pw1, pw2])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validation.ok) return
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw1 })
    setBusy(false)
    if (error) setError(error.message)
    else {
      setMsg('Password saved. You are now signed in.')
      setTimeout(() => navigate('/'), 900)
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center bg-gradient-to-b from-indigo-50 to-slate-50 px-4">
      <div className="w-full max-w-sm sm:max-w-md">
        {/* Heading */}
        <div className="mb-4 text-center">
          <div className="text-xs tracking-widest text-indigo-600">
            {sp.get('from') === 'invite' ? 'WELCOME' : 'ACCOUNT'}
          </div>
          <h1 className="mt-1 text-2xl font-semibold">Set your password</h1>
          <p className="mt-1 text-sm text-slate-600">Choose a new password to finish setup.</p>
        </div>

        {/* Status */}
        {error && (
          <div className={cx(s.alert, 'mb-3 border-rose-200 bg-rose-50 text-rose-700')} role="alert" aria-live="polite">
            {error}
          </div>
        )}
        {msg && (
          <div className={cx(s.alert, 'mb-3 border-emerald-200 bg-emerald-50 text-emerald-800')} role="status" aria-live="polite">
            {msg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className={cx(s.card, 'space-y-3 p-5 sm:p-6')} aria-busy={busy}>
          <div>
            <label htmlFor="pw1" className="text-sm text-slate-600">New password</label>
            <div className="relative">
              <input
                id="pw1"
                className={s.input}
                type={show1 ? 'text' : 'password'}
                value={pw1}
                onChange={(e)=>setPw1(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
                disabled={busy}
              />
              <button
                type="button"
                onClick={()=>setShow1(v=>!v)}
                className="absolute inset-y-0 right-2 my-1 rounded-md px-2 text-xs text-slate-600 hover:bg-slate-100"
                aria-label={show1 ? 'Hide password' : 'Show password'}
                disabled={busy}
              >
                {show1 ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Minimum 8 characters.</p>
          </div>

          <div>
            <label htmlFor="pw2" className="text-sm text-slate-600">Confirm password</label>
            <div className="relative">
              <input
                id="pw2"
                className={s.input}
                type={show2 ? 'text' : 'password'}
                value={pw2}
                onChange={(e)=>setPw2(e.target.value)}
                autoComplete="new-password"
                required
                disabled={busy}
              />
              <button
                type="button"
                onClick={()=>setShow2(v=>!v)}
                className="absolute inset-y-0 right-2 my-1 rounded-md px-2 text-xs text-slate-600 hover:bg-slate-100"
                aria-label={show2 ? 'Hide password' : 'Show password'}
                disabled={busy}
              >
                {show2 ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Inline validation (mobile-friendly) */}
          {!validation.ok && (pw1.length > 0 || pw2.length > 0) && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-rose-700">
              {validation.issues.map((i) => <li key={i}>{i}</li>)}
            </ul>
          )}

          <button
            className={cx(s.btn, s.primary, 'w-full')}
            disabled={busy || !validation.ok}
          >
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-slate-500">
          If this page says your session is missing, open the invite/reset link again from your email.
        </p>
      </div>
    </div>
  )
}
