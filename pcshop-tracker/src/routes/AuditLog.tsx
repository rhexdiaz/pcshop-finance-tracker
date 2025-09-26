import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useSession } from '../lib/session'
import { styles as s, cx } from '../ui'

type DiffValue = { old: unknown; new: unknown }
type Changes = Record<string, DiffValue> | null | undefined

type LogRow = {
  id: string
  created_at: string
  table_name: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  row_id: string | null
  actor_email: string | null
  changes?: Changes
}

function fmt(val: unknown) {
  if (val === null || val === undefined) return 'null'
  if (typeof val === 'number') return Intl.NumberFormat().format(val)
  if (typeof val === 'boolean') return String(val)
  if (typeof val === 'string') {
    return val.length > 60 ? JSON.stringify(val.slice(0, 57) + '…') : JSON.stringify(val)
  }
  try { return JSON.stringify(val) } catch { return String(val) }
}

/** Accepts JSONB object, JSON string, null/undefined and returns a safe object or null */
function normalizeChanges(input: unknown): Record<string, DiffValue> | null {
  if (!input) return null
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, DiffValue>) : null
    } catch {
      return null
    }
  }
  if (typeof input === 'object') return input as Record<string, DiffValue>
  return null
}

export default function AuditLog() {
  const { profile } = useSession()
  const isAdmin = profile?.role === 'admin'

  const [rows, setRows] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    // Wait until profile is known; only run for admins
    if (profile == null || !isAdmin) return

    let cancelled = false

    const fetchIt = async () => {
      try {
        setLoading(true); setError(null)
        const { data, error } = await supabase
          .from('audit_logs')
          .select('id, created_at, table_name, action, row_id, actor_email, changes')
          .order('created_at', { ascending: false })
          .limit(300)

        if (error) throw error

        if (!cancelled) {
          const safe = (data ?? []).map((r: any) => ({
            ...r,
            changes: normalizeChanges(r?.changes),
          })) as LogRow[]
          setRows(safe)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load audit logs')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchIt()

    // Realtime: refresh when base table mutates
    const ch = supabase
      .channel('audit-log-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_log' }, fetchIt)
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
  }, [profile, isAdmin])

  // While session/profile is resolving, show a soft loading
  if (profile == null) {
    return <div className={cx(s.card, 'p-4')}>Loading…</div>
  }

  if (!isAdmin) {
    return <div className={cx(s.alert, 'm-4 border-rose-200 bg-rose-50 text-rose-700')}>Admins only.</div>
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return rows
    return rows.filter(r =>
      `${r.table_name} ${r.action} ${r.actor_email ?? ''}`.toLowerCase().includes(term)
    )
  }, [rows, q])

  const ActionBadge = ({ a }: { a: LogRow['action'] }) => (
    <span
      className={cx(
        'rounded-md px-2 py-0.5 text-xs font-semibold ring-1',
        a === 'DELETE' && 'bg-rose-50 text-rose-700 ring-rose-200',
        a === 'UPDATE' && 'bg-amber-50 text-amber-700 ring-amber-200',
        a === 'INSERT' && 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      )}
    >
      {a}
    </span>
  )

  return (
    <section className="grid gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Audit Log</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search table, action, email…"
          className={s.input}
          style={{ maxWidth: 320 }}
        />
      </header>

      {/* ===== Mobile cards ===== */}
      <div className="grid gap-3 md:hidden">
        {loading ? (
          <div className={cx(s.card, 'p-4 text-sm text-slate-600')}>Loading…</div>
        ) : error ? (
          <div className={cx(s.card, 'p-4 text-sm text-rose-700')}>⚠ {error}</div>
        ) : filtered.length === 0 ? (
          <div className={cx(s.card, 'p-4 text-sm text-slate-600')}>No entries.</div>
        ) : (
          filtered.map((r) => {
            const ch = normalizeChanges(r.changes)
            const hasChanges = r.action === 'UPDATE' && ch && Object.keys(ch).length > 0

            return (
              <div key={r.id} className={cx(s.card, 'p-3')}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] text-slate-500">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                    <div className="mt-0.5 text-sm font-medium">{r.table_name}</div>
                    <div className="text-[13px] text-slate-600">{r.actor_email ?? '—'}</div>
                  </div>
                  <ActionBadge a={r.action} />
                </div>

                {hasChanges ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-slate-700 underline underline-offset-2">
                      Changes
                    </summary>
                    <div className="mt-2 space-y-1">
                      {Object.entries(ch!).map(([field, v]) => (
                        <div key={field} className="rounded border border-slate-200 bg-white p-2 text-xs">
                          <div className="mb-1 font-medium">{field}</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-slate-600">
                              old: <code className="break-all">{fmt((v as DiffValue)?.old)}</code>
                            </div>
                            <div className="text-slate-800">
                              new: <code className="break-all">{fmt((v as DiffValue)?.new)}</code>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : (
                  <div className="mt-2 text-xs text-slate-500">—</div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ===== Desktop table ===== */}
      <div className={cx(s.card, 'hidden md:block')}>
        <div className="overflow-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr>
                <th className={s.th}>Time</th>
                <th className={s.th}>Table</th>
                <th className={s.th}>Action</th>
                <th className={s.th}>Actor (email)</th>
                <th className={s.th}>Changes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className={s.td} colSpan={5}>Loading…</td></tr>
              ) : error ? (
                <tr><td className={s.td} colSpan={5}>⚠ {error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className={s.td} colSpan={5}>No entries.</td></tr>
              ) : (
                filtered.map((r) => {
                  const ch = normalizeChanges(r.changes)
                  const hasChanges = r.action === 'UPDATE' && ch && Object.keys(ch).length > 0

                  return (
                    <tr key={r.id} className="border-t align-top">
                      <td className={s.td}>{new Date(r.created_at).toLocaleString()}</td>
                      <td className={s.td}>{r.table_name}</td>
                      <td className={s.td}><ActionBadge a={r.action} /></td>
                      <td className={s.td}>{r.actor_email ?? '—'}</td>
                      <td className={s.td}>
                        {hasChanges ? (
                          <div className="space-y-1">
                            {Object.entries(ch!).map(([field, v]) => (
                              <div key={field} className="rounded border border-slate-200 bg-white p-2 text-xs">
                                <div className="mb-1 font-medium">{field}</div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="text-slate-600">old: <code>{fmt((v as DiffValue)?.old)}</code></div>
                                  <div className="text-slate-800">new: <code>{fmt((v as DiffValue)?.new)}</code></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
