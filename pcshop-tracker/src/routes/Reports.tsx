// src/routes/Reports.tsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { styles as s, cx } from '../ui'
import { fmtCurrency } from '../lib/currency'
import { format } from 'date-fns'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'

// helpers
const iso = (d: Date) => d.toISOString().slice(0, 10)
const startOfYear = () => new Date(new Date().getFullYear(), 0, 1)

type Row = { month: string; income: number; expenses: number; profit: number }
type RpcRow = { month: string; income: number; expenses: number; profit: number }

export default function Reports() {
  const [fromDate, setFromDate] = useState(iso(startOfYear()))
  const [toDate, setToDate] = useState(iso(new Date()))
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.rpc('monthly_profit', {
      from_date: fromDate,
      to_date: toDate,
    })
    setLoading(false)
    if (error) return setError(error.message)

    const mapped: Row[] = (data as RpcRow[]).map(r => ({
      month: format(new Date(r.month), 'yyyy-MM'),
      income: Number(r.income) || 0,
      expenses: Number(r.expenses) || 0,
      profit: Number(r.profit) || 0,
    }))
    setRows(mapped)
  }

  useEffect(() => { fetchData() }, []) // initial
  useEffect(() => { fetchData() }, [fromDate, toDate])

  const totals = useMemo(() => {
    const income = rows.reduce((a, r) => a + r.income, 0)
    const expenses = rows.reduce((a, r) => a + r.expenses, 0)
    const profit = rows.reduce((a, r) => a + r.profit, 0)
    const months = rows.length || 1
    const avgProfit = profit / months

    const last = rows[rows.length - 1]?.profit ?? 0
    const prev = rows[rows.length - 2]?.profit ?? 0
    const mom = last - prev // month-over-month profit change

    return { income, expenses, profit, avgProfit, mom }
  }, [rows])

  return (
    <section className="grid gap-6">
      <header className={cx(s.card, 'p-4')}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <label className="text-sm text-slate-600">From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={s.input} />
          </div>
          <div>
            <label className="text-sm text-slate-600">To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={s.input} />
          </div>

          <Kpi title="Income" value={fmtCurrency(totals.income)} />
          <Kpi title="Expenses" value={fmtCurrency(totals.expenses)} />
          <Kpi
            title="Profit"
            value={fmtCurrency(totals.profit)}
            tone={totals.profit >= 0 ? 'pos' : 'neg'}
            sub={totals.mom === 0 ? 'MoM: –' : `MoM: ${totals.mom > 0 ? '+' : ''}${fmtCurrency(totals.mom)}`}
          />
        </div>
        <div className="mt-3 text-sm text-slate-600">
          Avg monthly profit: <span className="font-medium">{fmtCurrency(totals.avgProfit)}</span>
        </div>
      </header>

      <div className={cx(s.card, 'p-4')}>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <ComposedChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => fmtCurrency(Number(v))} />
              <Tooltip formatter={(val: any) => fmtCurrency(Number(val))} />
              <Legend />
              <Bar dataKey="income" name="Income" />
              <Bar dataKey="expenses" name="Expenses" />
              <Line type="monotone" dataKey="profit" name="Profit" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={s.card}>
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr>
                <th className={s.th}>Month</th>
                <th className={cx(s.th, 'text-right')}>Income</th>
                <th className={cx(s.th, 'text-right')}>Expenses</th>
                <th className={cx(s.th, 'text-right')}>Profit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className={s.td} colSpan={4}>Loading…</td></tr>
              ) : error ? (
                <tr><td className={s.td} colSpan={4}>&#9888; {error}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className={s.td} colSpan={4}>No data for selected period.</td></tr>
              ) : (
                rows.map(r => (
                  <tr key={r.month} className="border-t hover:bg-slate-50/50">
                    <td className={s.td}>{r.month}</td>
                    <td className={cx(s.td, 'text-right')}>{fmtCurrency(r.income)}</td>
                    <td className={cx(s.td, 'text-right')}>{fmtCurrency(r.expenses)}</td>
                    <td className={cx(s.td, 'text-right', r.profit >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                      {fmtCurrency(r.profit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t bg-slate-50">
                  <td className={s.td}>Total</td>
                  <td className={cx(s.td, 'text-right font-medium')}>{fmtCurrency(totals.income)}</td>
                  <td className={cx(s.td, 'text-right font-medium')}>{fmtCurrency(totals.expenses)}</td>
                  <td className={cx(s.td, 'text-right font-semibold', totals.profit >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                    {fmtCurrency(totals.profit)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </section>
  )
}

function Kpi({
  title, value, sub, tone,
}: { title: string; value: string; sub?: string; tone?: 'pos' | 'neg' }) {
  const toneCls = tone === 'pos'
    ? 'border-emerald-200 bg-emerald-50'
    : tone === 'neg'
    ? 'border-rose-200 bg-rose-50'
    : 'border-slate-200 bg-white'
  return (
    <div className={cx('rounded-2xl p-3 shadow-sm ring-1 ring-black/5', toneCls)}>
      <div className="text-xs text-slate-600">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  )
}
