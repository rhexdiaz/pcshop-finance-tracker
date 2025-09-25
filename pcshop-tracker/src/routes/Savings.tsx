import { useEffect, useMemo, useState } from 'react'
import { formatISO } from 'date-fns'
import { supabase } from '../lib/supabaseClient'
import { fmtCurrency } from '../lib/currency'
import { useSession } from '../lib/session'
import { styles as s, cx } from '../ui'

type Goal = { id: string; name: string; target: number }
type Contrib = { id: string; goal_id: string; date: string; amount: number; note?: string }

export default function Savings() {
  const { profile } = useSession()
  const canWrite = profile?.role === 'admin' || profile?.role === 'editor'

  const [goals, setGoals] = useState<Goal[]>([])
  const [contribs, setContribs] = useState<Contrib[]>([])
  const [gName, setGName] = useState('')
  const [gTarget, setGTarget] = useState('0')
  const [goalId, setGoalId] = useState<string>('')
  const [date, setDate] = useState(formatISO(new Date(), { representation: 'date' }))
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const refresh = async () => {
    const [g, c] = await Promise.all([
      supabase.from('savings_goals').select('*').order('created_at', { ascending: false }),
      supabase.from('savings_contributions').select('*').order('date', { ascending: false }),
    ])
    setGoals((g.data || []) as Goal[])
    setContribs((c.data || []) as Contrib[])
  }
  useEffect(() => { refresh() }, [])
  useEffect(() => { if (goals.length && !goalId) setGoalId(goals[0].id) }, [goals, goalId])

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canWrite) return
    const target = Number(gTarget)
    if (!gName || !Number.isFinite(target) || target < 0) return
    await supabase.from('savings_goals').insert({ name: gName, target })
    setGName(''); setGTarget('0'); refresh()
  }

  const addContribution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canWrite || !goalId) return
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) return
    await supabase.from('savings_contributions').insert({ goal_id: goalId, date, amount: amt, note })
    await supabase.from('transactions').insert({
      date, type: 'savings',
      category: (goals.find(g => g.id === goalId)?.name) || 'Savings',
      amount: amt,
      note: note ? `Contribution: ${note}` : 'Savings contribution',
    })
    setAmount(''); setNote(''); refresh()
  }

  const totals = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of contribs) map[c.goal_id] = (map[c.goal_id] || 0) + Number(c.amount)
    return map
  }, [contribs])

  return (
    <section className="grid gap-8">
      {!canWrite && (
        <div className={cx(s.alert, 'border-amber-200 bg-amber-50 text-amber-800')}>
          Read-only access. Ask an admin to upgrade your role to <span className="font-medium">Editor</span> if you need to manage savings.
        </div>
      )}

      {/* Add goal */}
      <form onSubmit={addGoal} className={cx(s.card, 'grid grid-cols-1 gap-3 p-4 md:grid-cols-6')} aria-disabled={!canWrite}>
        <div className="md:col-span-3">
          <label className="text-sm text-slate-600">Goal name</label>
          <input value={gName} onChange={(e)=>setGName(e.target.value)} placeholder="Emergency Fund" className={s.input} disabled={!canWrite}/>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-slate-600">Target</label>
          <input type="number" step="0.01" value={gTarget} onChange={(e)=>setGTarget(e.target.value)} className={s.input} disabled={!canWrite}/>
        </div>
        <div className="md:col-span-1 flex items-end">
          <button className={cx(s.btn, s.primary)} type="submit" disabled={!canWrite}>Add Goal</button>
        </div>
      </form>

      {/* Goals list */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {goals.length === 0 ? (
          <div className={cx(s.card, 'p-4')}>No goals yet.</div>
        ) : (
          goals.map(g => {
            const saved = totals[g.id] || 0
            const pct = Math.min(100, Math.round((saved / (g.target || 1)) * 100))
            return (
              <div key={g.id} className={cx(s.card, 'p-4')}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-800">{g.name}</div>
                    <div className="text-sm text-slate-500">Target: {fmtCurrency(g.target)}</div>
                  </div>
                  <div className="text-sm">{pct}%</div>
                </div>
                <div className="mt-3 h-3 w-full rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 text-sm text-slate-600">Saved: {fmtCurrency(saved)}</div>
              </div>
            )
          })
        )}
      </div>

      {/* Add contribution */}
      <form onSubmit={addContribution} className={cx(s.card, 'grid grid-cols-1 gap-3 p-4 md:grid-cols-6')} aria-disabled={!canWrite}>
        <div className="md:col-span-2">
          <label className="text-sm text-slate-600">Goal</label>
          <select value={goalId} onChange={(e)=>setGoalId(e.target.value)} className={s.select} disabled={!canWrite}>
            {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-slate-600">Date</label>
          <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className={s.input} disabled={!canWrite}/>
        </div>
        <div>
          <label className="text-sm text-slate-600">Amount</label>
          <input type="number" step="0.01" value={amount} onChange={(e)=>setAmount(e.target.value)} className={s.input} disabled={!canWrite}/>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-slate-600">Note</label>
          <input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="optional" className={s.input} disabled={!canWrite}/>
        </div>
        <div className="md:col-span-6 flex items-end justify-end">
          <button className={cx(s.btn, s.primary)} type="submit" disabled={!canWrite}>Add Contribution</button>
        </div>
      </form>

      {/* Recent contributions */}
      <div className={s.card}>
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr>
                <th className={s.th}>Date</th>
                <th className={s.th}>Goal</th>
                <th className={cx(s.th, 'text-right')}>Amount</th>
                <th className={s.th}>Note</th>
              </tr>
            </thead>
            <tbody>
              {contribs.length === 0 ? (
                <tr><td className={s.td} colSpan={4}>No contributions yet.</td></tr>
              ) : (
                contribs.map(c => {
                  const g = goals.find(x => x.id === c.goal_id)
                  return (
                    <tr key={c.id} className="border-t hover:bg-slate-50/50">
                      <td className={cx(s.td, 'whitespace-nowrap')}>{c.date}</td>
                      <td className={s.td}>{g?.name || c.goal_id}</td>
                      <td className={cx(s.td, 'text-right font-semibold')}>{fmtCurrency(Number(c.amount))}</td>
                      <td className={s.td}>{c.note}</td>
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
