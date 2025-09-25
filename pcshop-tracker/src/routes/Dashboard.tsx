import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fmtCurrency } from '../lib/currency'
import { styles as s, cx } from '../ui'

type Row = { amount: number; type: 'income' | 'expense' | 'bill' | 'savings' }

export default function Dashboard() {
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    supabase
      .from('transactions')
      .select('amount,type')
      .order('date', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!error && data) setRows(data as Row[])
      })
  }, [])

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          if (r.type === 'income') acc.income += Number(r.amount)
          if (r.type === 'expense') acc.expense += Number(r.amount)
          if (r.type === 'savings') acc.savings += Number(r.amount)
          return acc
        },
        { income: 0, expense: 0, savings: 0 }
      ),
    [rows]
  )

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card title="Income" value={fmtCurrency(totals.income)} accent="from-emerald-500 to-teal-500" />
      <Card title="Expenses" value={fmtCurrency(totals.expense)} accent="from-rose-500 to-pink-500" negative />
      <Card title="Savings" value={fmtCurrency(totals.savings)} accent="from-indigo-500 to-violet-500" />
    </section>
  )
}

function Card({ title, value, negative, accent }: { title: string; value: string; negative?: boolean; accent: string }) {
  return (
    <div className={cx(s.card, 'p-4 relative overflow-hidden')}>
      <div className={cx('absolute inset-x-0 -top-1 h-1 bg-gradient-to-r', accent)} />
      <div className="text-sm text-slate-500">{title}</div>
      <div className={cx('mt-1 text-2xl font-bold', negative && 'text-rose-600')}>{value}</div>
    </div>
  )
}
