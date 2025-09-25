import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { styles as s, cx } from '../ui'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function SetPassword() {
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setError('Your session is missing or expired. Please open the invite link again or sign in.')
      }
    })
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (pw1.length < 8) return setError('Password must be at least 8 characters.')
    if (pw1 !== pw2) return setError('Passwords do not match.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw1 })
    setBusy(false)
    if (error) setError(error.message)
    else {
      setMsg('Password set. You are signed in.')
      setTimeout(() => navigate('/'), 800)
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center bg-gradient-to-b from-indigo-50 to-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-4 text-center">
          <div className="text-xs tracking-widest text-indigo-600">
            {sp.get('from') === 'invite' ? 'WELCOME' : 'ACCOUNT'}
          </div>
          <h1 className="mt-1 text-2xl font-semibold">Set your password</h1>
          <p className="mt-1 text-sm text-slate-600">Choose a new password to finish setup.</p>
        </div>

        {error && <div className={cx(s.alert, 'mb-3 border-rose-200 bg-rose-50 text-rose-700')}>{error}</div>}
        {msg &&   <div className={cx(s.alert, 'mb-3 border-emerald-200 bg-emerald-50 text-emerald-800')}>{msg}</div>}

        <form onSubmit={submit} className={cx(s.card, 'p-6 space-y-3')}>
          <div>
            <label className="text-sm text-slate-600">New password</label>
            <input className={s.input} type="password" value={pw1} onChange={(e)=>setPw1(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-slate-600">Confirm password</label>
            <input className={s.input} type="password" value={pw2} onChange={(e)=>setPw2(e.target.value)} required />
          </div>
          <button className={cx(s.btn, s.primary, 'w-full')} disabled={busy}>
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </form>
      </div>
    </div>
  )
}
