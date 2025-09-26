import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fmtCurrency } from '../lib/currency'
import { styles as s, cx } from '../ui'

type TxType = 'income' | 'expense' | 'savings'
type Row = { id?: string; date?: string; amount: number; type: TxType; category?: string; note?: string }

export default function Dashboard() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchIt = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('transactions')
        .select('id,date,amount,type,category,note')
        .order('date', { ascending: false })
        .limit(100)
      setRows((data as Row[]) || [])
      setLoading(false)
    }
    fetchIt()
  }, [])

  const totals = useMemo(() => {
    const acc = { income: 0, expense: 0, savings: 0 }
    for (const r of rows) {
      const amt = Number(r.amount) || 0
      if (r.type === 'income') acc.income += amt
      if (r.type === 'expense') acc.expense += amt
      if (r.type === 'savings') acc.savings += amt
    }
    const profit = acc.income - acc.expense
    return { ...acc, profit }
  }, [rows])

  return (
    <section className="grid gap-6">
      {/* KPI cards — stack on mobile, 2 cols on small screens, 4 on md+ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card title="Income" value={fmtCurrency(totals.income)} accent="from-emerald-500 to-teal-500" />
        <Card title="Expenses" value={fmtCurrency(totals.expense)} accent="from-rose-500 to-pink-500" negative />
        <Card title="Savings" value={fmtCurrency(totals.savings)} accent="from-indigo-500 to-violet-500" />
        <Card
          title="Profit"
          value={fmtCurrency(totals.profit)}
          accent={totals.profit >= 0 ? 'from-emerald-500 to-lime-500' : 'from-rose-500 to-orange-500'}
          negative={totals.profit < 0}
        />
      </div>

      {/* Recent Activity */}
      <div className={cx(s.card, 'p-4')}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent Activity</h2>
          <span className="text-xs text-slate-500">Last 100 entries</span>
        </div>

        {/* Mobile cards */}
        <div className="grid gap-3 md:hidden">
          {loading ? (
            <div className="text-sm text-slate-600">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-600">No activity yet.</div>
          ) : (
            rows.slice(0, 12).map((r) => (
              <div key={r.id} className={cx('rounded-xl border border-slate-200 bg-white p-3 shadow-sm ring-1 ring-black/5')}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{r.category || r.type}</div>
                  <div
                    className={cx(
                      'text-sm font-semibold',
                      r.type === 'income' ? 'text-emerald-700' : r.type === 'expense' ? 'text-rose-700' : 'text-indigo-700'
                    )}
                  >
                    {fmtCurrency(Number(r.amount))}
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-600">{r.date} • {r.type}</div>
                {r.note && <div className="mt-1 text-sm">{r.note}</div>}
              </div>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="overflow-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr>
                  <th className={s.th}>Date</th>
                  <th className={s.th}>Type</th>
                  <th className={s.th}>Category</th>
                  <th className={s.th}>Note</th>
                  <th className={cx(s.th, 'text-right')}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className={s.td} colSpan={5}>Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td className={s.td} colSpan={5}>No activity yet.</td></tr>
                ) : (
                  rows.slice(0, 20).map((r) => (
                    <tr key={r.id} className="border-t hover:bg-slate-50/50">
                      <td className={s.td}>{r.date}</td>
                      <td className={s.td}>{r.type}</td>
                      <td className={s.td}>{r.category}</td>
                      <td className={s.td}>{r.note}</td>
                      <td
                        className={cx(
                          s.td,
                          'text-right font-semibold',
                          r.type === 'income' ? 'text-emerald-700' : r.type === 'expense' ? 'text-rose-700' : 'text-indigo-700'
                        )}
                      >
                        {fmtCurrency(Number(r.amount))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

function Card({ title, value, negative, accent }: { title: string; value: string; negative?: boolean; accent: string }) {
  return (
    <div className={cx(s.card, 'relative overflow-hidden p-4')}>
      <div className={cx('absolute inset-x-0 -top-1 h-1 bg-gradient-to-r', accent)} />
      <div className="text-sm text-slate-500">{title}</div>
      <div className={cx('mt-1 text-2xl font-bold', negative && 'text-rose-600')}>{value}</div>
    </div>
  )
}
