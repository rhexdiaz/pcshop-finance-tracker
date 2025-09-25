import { useEffect, useState } from 'react'
import { useSession } from '../lib/session'
import { supabase } from '../lib/supabaseClient'
import { cx, styles as s } from '../ui'

type Role = 'viewer' | 'editor' | 'admin'

export default function AdminInvite() {
  const { profile } = useSession()

  // form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('viewer')
  const [showPw, setShowPw] = useState(false)

  // ui state
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile && profile.role !== 'admin') setError('Not authorized. Admins only.')
  }, [profile])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (profile?.role !== 'admin') return

    setBusy(true)
    setMsg(null)
    setError(null)

    try {
      const { error } = await supabase.functions.invoke('invite', {
        body: { email, password, fullName, role },
      })
      if (error) throw new Error(error.message)

      setMsg(
        'User created. If email confirmations are enabled, the user will receive a verification link.'
      )
      setFullName('')
      setEmail('')
      setPassword('')
      setRole('viewer')
    } catch (err: any) {
      setError(err?.message || 'Invite failed')
    } finally {
      setBusy(false)
    }
  }

  if (!profile) return <div className="p-4">Loading…</div>
  if (profile.role !== 'admin') {
    return (
      <div className={cx(s.alert, 'm-4 border-rose-200 bg-rose-50 text-rose-700')}>
        Not authorized. Admins only.
      </div>
    )
  }

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold">Invite / Create User</h1>
        <p className="text-sm text-slate-600">
          Create an account and assign a role. Use <b>Viewer</b> for read-only, <b>Editor</b> for CRUD,{' '}
          <b>Admin</b> for full control.
        </p>
      </div>

      {msg && <div className={cx(s.alert, 'border-emerald-200 bg-emerald-50 text-emerald-800')}>{msg}</div>}
      {error && <div className={cx(s.alert, 'border-rose-200 bg-rose-50 text-rose-700')}>{error}</div>}

      <form onSubmit={submit} className={cx(s.card, 'grid grid-cols-1 gap-3 p-6 md:grid-cols-6')}>
        <div className="md:col-span-3">
          <label className="text-sm text-slate-600">Full name</label>
          <input
            className={s.input}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Juan Dela Cruz"
            required
          />
        </div>

        <div className="md:col-span-3">
          <label className="text-sm text-slate-600">Email</label>
          <input
            className={s.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@shop.com"
            required
          />
        </div>

        <div className="md:col-span-3">
          <label className="text-sm text-slate-600">Password</label>
          <div className="relative">
            <input
              className={s.input}
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute inset-y-0 right-2 my-1 rounded-md px-2 text-xs text-slate-600 hover:bg-slate-100"
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="text-sm text-slate-600">Role</label>
          <select
            className={s.select}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="viewer">Viewer (read-only)</option>
            <option value="editor">Editor (edit/delete)</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="md:col-span-1 flex items-end justify-end">
          <button className={cx(s.btn, s.primary, 'w-full')} type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>

      <div className={cx(s.card, 'p-4 text-sm text-slate-600')}>
        <ul className="list-disc pl-5 space-y-1">
          <li>This page calls a Supabase <b>Edge Function</b> named <code>invite</code>.</li>
          <li>Your current session must be <b>admin</b> (checked inside the function).</li>
          <li>The service role key stays on Supabase (stored as a secret), never in the browser.</li>
        </ul>
      </div>
    </section>
  )
}
