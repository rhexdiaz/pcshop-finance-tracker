import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useSession } from '../lib/session'
import { styles as s, cx } from '../ui'

type LogRow = {
  id: string
  created_at: string
  table_name: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  row_id: string | null              // kept for future use, not shown
  actor_email: string | null
  changes?: Record<string, { old: unknown; new: unknown }> | null
}

export default function AuditLog() {
  const { profile } = useSession()
  const isAdmin = profile?.role === 'admin'

  const [rows, setRows] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    const fetchIt = async () => {
      setLoading(true)
      setError(null)

      // read from the view `audit_logs`
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, created_at, table_name, action, row_id, actor_email, changes')
        .order('created_at', { ascending: false })
        .limit(300)

      setLoading(false)
      if (error) return setError(error.message)
      setRows((data as any) || [])
    }

    fetchIt()

    // optional realtime refresh
    const channel = supabase
      .channel('audit-log-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_log' },
        () => fetchIt()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (!isAdmin) {
    return (
      <div className={cx(s.alert, 'm-4 border-rose-200 bg-rose-50 text-rose-700')}>
        Admins only.
      </div>
    )
  }

  // Removed row_id from the search string
  const filtered = rows.filter((r) => {
    const hay = `${r.table_name} ${r.action} ${r.actor_email ?? ''}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })

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

      <div className={s.card}>
        <div className="overflow-auto">
          {/* narrower now that Row ID is gone */}
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
                <tr>
                  <td className={s.td} colSpan={5}>Loading…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td className={s.td} colSpan={5}>⚠ {error}</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className={s.td} colSpan={5}>No entries.</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className={s.td}>{new Date(r.created_at).toLocaleString()}</td>
                    <td className={s.td}>{r.table_name}</td>
                    <td
                      className={cx(
                        s.td,
                        r.action === 'DELETE'
                          ? 'text-rose-700'
                          : r.action === 'UPDATE'
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      )}
                    >
                      {r.action}
                    </td>
                    <td className={s.td}>{r.actor_email ?? '—'}</td>
                    <td className={s.td}>
                      {r.action === 'UPDATE' && r.changes && Object.keys(r.changes).length > 0 ? (
                        <div className="space-y-1">
                          {Object.entries(r.changes).map(([k, v]: any) => (
                            <div key={k} className="rounded border border-slate-200 bg-white p-1 text-xs">
                              <div className="font-medium">{k}</div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-slate-600">
                                  old: <code>{JSON.stringify(v.old)}</code>
                                </div>
                                <div className="text-slate-800">
                                  new: <code>{JSON.stringify(v.new)}</code>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
