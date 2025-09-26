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
type Txn = { date: string; type: string; category: string; amount: number; note: string | null }

export default function Reports() {
  const [fromDate, setFromDate] = useState(iso(startOfYear()))
  const [toDate, setToDate] = useState(iso(new Date()))
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'summary' | 'txns' | null>(null)

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

  // ---------- CSV helpers ----------
  const csvEscape = (val: unknown) => {
    if (val === null || val === undefined) return ''
    const s = String(val)
    const mustQuote = /[",\n\r]/.test(s)
    const body = s.replace(/"/g, '""')
    return mustQuote ? `"${body}"` : body
  }

  const downloadCSV = (filename: string, rows: string[][]) => {
    const bom = '\uFEFF'
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\r\n')
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const exportMonthlyCSV = () => {
    const filename = `monthly_summary_${fromDate}_to_${toDate}.csv`
    const header = ['Month', 'Income', 'Expenses', 'Profit']
    const data = rows.map(r => [r.month, String(r.income), String(r.expenses), String(r.profit)])
    downloadCSV(filename, [header, ...data])
  }

  const exportTransactionsCSV = async () => {
    try {
      setExporting('txns')
      const { data, error } = await supabase
        .from('transactions')
        .select('date,type,category,amount,note')
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: true })
      if (error) throw error

      const txns = (data as Txn[]) || []
      const filename = `transactions_${fromDate}_to_${toDate}.csv`
      const header = ['Date', 'Type', 'Category', 'Amount', 'Note']
      const rows = txns.map(t => [
        t.date,
        t.type,
        t.category ?? '',
        String(t.amount ?? 0),
        t.note ?? '',
      ])
      downloadCSV(filename, [header, ...rows])
    } catch (e: any) {
      setError(e?.message || 'Export failed')
    } finally {
      setExporting(null)
    }
  }

  return (
    <section className="grid gap-6">
      {/* Controls + KPIs */}
      <header className={cx(s.card, 'p-4')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            className={cx(s.btn, s.secondary)}
            onClick={exportMonthlyCSV}
            disabled={rows.length === 0}
            title="Export the monthly summary table"
          >
            Export Monthly Summary (CSV)
          </button>

          <button
            className={cx(s.btn, s.primary)}
            onClick={exportTransactionsCSV}
            disabled={exporting === 'txns'}
            title="Export all transactions within the selected date range"
          >
            {exporting === 'txns' ? 'Exporting…' : 'Export Transactions (CSV)'}
          </button>
        </div>

        <div className="mt-3 text-sm text-slate-600">
          Avg monthly profit: <span className="font-medium">{fmtCurrency(totals.avgProfit)}</span>
        </div>
      </header>

      {/* Chart */}
      <div className={cx(s.card, 'p-4')}>
        <div className="h-56 w-full md:h-80">
          <ResponsiveContainer>
            <ComposedChart data={rows} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              {/* Gradients */}
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb7185" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#fb7185" stopOpacity={0.55} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(v) => fmtCurrency(Number(v))}
              />

              <Tooltip
                contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0' }}
                labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                formatter={(val: any, name) => [fmtCurrency(Number(val)), name]}
              />
              <Legend
                wrapperStyle={{ paddingTop: 6 }}
                formatter={(val: string) => (
                  <span style={{ color: '#334155' }}>{val}</span>
                )}
              />

              <Bar dataKey="expenses" name="Expenses" fill="url(#expenseGrad)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="income" name="Income" fill="url(#incomeGrad)" radius={[6, 6, 0, 0]} />
              <Line
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 3, fill: '#6366f1' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mobile monthly cards */}
      <div className="grid gap-3 md:hidden">
        {loading ? (
          <div className={cx(s.card, 'p-4 text-sm text-slate-600')}>Loading…</div>
        ) : error ? (
          <div className={cx(s.card, 'p-4 text-sm text-rose-700')}>{error}</div>
        ) : rows.length === 0 ? (
          <div className={cx(s.card, 'p-4 text-sm text-slate-600')}>No data for selected period.</div>
        ) : (
          rows.map((r) => (
            <div key={r.month} className={cx(s.card, 'p-3')}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{r.month}</div>
                <div className={cx('text-sm font-semibold', r.profit >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                  {fmtCurrency(r.profit)}
                </div>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-1">
                  <div className="text-[11px] text-slate-500">Income</div>
                  <div className="font-medium">{fmtCurrency(r.income)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-1">
                  <div className="text-[11px] text-slate-500">Expenses</div>
                  <div className="font-medium">{fmtCurrency(r.expenses)}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className={cx(s.card, 'hidden md:block')}>
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
