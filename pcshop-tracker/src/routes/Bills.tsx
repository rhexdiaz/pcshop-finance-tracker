// src/routes/Bills.tsx
import { useEffect, useState } from 'react'
import { formatISO } from 'date-fns'
import { supabase } from '../lib/supabaseClient'
import { fmtCurrency } from '../lib/currency'
import { useSession } from '../lib/session'
import { styles as s, cx } from '../ui'

type Bill = {
  id: string
  due_date: string
  category: string
  amount: number
  paid: boolean
  paid_at: string | null
  recurring: boolean
  recur_day: number | null
  transaction_id: string | null // link to the expense in transactions
}

const BILL_CATS = [
  'Electricity',
  'Internet',
  'Water',
  'Rent',
  'Domain/Hosting',
  'SaaS',
  'Loan',
  'Other',
]

export default function Bills() {
  const { profile } = useSession()
  const canWrite = profile?.role === 'admin' || profile?.role === 'editor'

  const [items, setItems] = useState<Bill[]>([])
  const [due, setDue] = useState<string>(formatISO(new Date(), { representation: 'date' }))
  const [cat, setCat] = useState(BILL_CATS[0])
  const [amt, setAmt] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [recurDay, setRecurDay] = useState<number | ''>('')

  // NEW: delete busy state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const refresh = async () => {
    const { data, error } = await supabase
      .from('bills')
      .select('id,due_date,category,amount,paid,paid_at,recurring,recur_day,transaction_id')
      .order('due_date', { ascending: true })

    if (!error && data) setItems(data as Bill[])
  }

  useEffect(() => { refresh() }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canWrite) return
    const amount = Number(amt)
    if (!Number.isFinite(amount) || amount <= 0) return

    await supabase.from('bills').insert({
      due_date: due,
      category: cat,
      amount,
      recurring,
      recur_day: recurring ? Number(recurDay) || null : null,
    })

    setAmt('')
    setRecurring(false)
    setRecurDay('')
    refresh()
  }

  const togglePaid = async (bill: Bill) => {
    if (!canWrite) return

    // Mark as PAID
    if (!bill.paid) {
      let txnId = bill.transaction_id

      // Create expense only if not yet linked
      if (!txnId) {
        const today = new Date().toISOString().slice(0, 10)
        const note = `Bill paid: ${bill.category}`
        const { data, error } = await supabase
          .from('transactions')
          .insert({
            date: today,
            type: 'expense',
            category: bill.category,
            amount: bill.amount,
            note,
          })
          .select('id')
          .single()

        if (error) {
          console.error('Create expense failed:', error.message)
          return
        }
        txnId = data!.id as string
      }

      const nowISO = new Date().toISOString()
      const { error: updErr } = await supabase
        .from('bills')
        .update({ paid: true, paid_at: nowISO, transaction_id: txnId })
        .eq('id', bill.id)

      if (!updErr) {
        setItems(prev =>
          prev.map(b =>
            b.id === bill.id ? { ...b, paid: true, paid_at: nowISO, transaction_id: txnId! } : b
          )
        )
      }
      return
    }

    // Mark as UNPAID
    if (bill.paid) {
      if (bill.transaction_id) {
        await supabase.from('transactions').delete().eq('id', bill.transaction_id)
      }
      const { error: updErr } = await supabase
        .from('bills')
        .update({ paid: false, paid_at: null, transaction_id: null })
        .eq('id', bill.id)

      if (!updErr) {
        setItems(prev =>
          prev.map(b =>
            b.id === bill.id ? { ...b, paid: false, paid_at: null, transaction_id: null } : b
          )
        )
      }
    }
  }

  // UPDATED: confirm before deleting, also disable button while deleting
  const del = async (bill: Bill) => {
    if (!canWrite) return

    const warnLinked = bill.transaction_id
      ? '\n\nNote: This will also delete the linked expense in Transactions.'
      : ''

    const ok = window.confirm(
      `Delete this bill?\n\n` +
      `Category: ${bill.category}\n` +
      `Due date: ${bill.due_date}\n` +
      `Amount:  ${fmtCurrency(Number(bill.amount))}${warnLinked}\n\n` +
      `This cannot be undone.`
    )
    if (!ok) return

    setDeletingId(bill.id)

    if (bill.transaction_id) {
      await supabase.from('transactions').delete().eq('id', bill.transaction_id)
    }
    await supabase.from('bills').delete().eq('id', bill.id)

    setDeletingId(null)
    setItems(prev => prev.filter(x => x.id !== bill.id))
  }

  return (
    <section className="grid gap-6">
      {!canWrite && (
        <div className={cx(s.alert, 'border-amber-200 bg-amber-50 text-amber-800')}>
          Read-only access. Ask an admin to upgrade your role to{' '}
          <span className="font-medium">Editor</span> if you need to manage bills.
        </div>
      )}

      {/* Add Bill */}
      <form
        onSubmit={add}
        className={cx(s.card, 'grid grid-cols-1 gap-3 p-4 md:grid-cols-6')}
        aria-disabled={!canWrite}
      >
        <div>
          <label className="text-sm text-slate-600">Due date</label>
          <input
            type="date"
            value={due}
            onChange={e => setDue(e.target.value)}
            className={s.input}
            disabled={!canWrite}
          />
        </div>

        <div>
          <label className="text-sm text-slate-600">Category</label>
          <select
            value={cat}
            onChange={e => setCat(e.target.value)}
            className={s.select}
            disabled={!canWrite}
          >
            {BILL_CATS.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-slate-600">Amount</label>
          <input
            type="number"
            step="0.01"
            value={amt}
            onChange={e => setAmt(e.target.value)}
            className={s.input}
            placeholder="e.g., 1500"
            disabled={!canWrite}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="rec"
            type="checkbox"
            checked={recurring}
            onChange={e => setRecurring(e.target.checked)}
            disabled={!canWrite}
          />
          <label htmlFor="rec" className="text-sm text-slate-600">
            Recurring monthly
          </label>
        </div>

        <div>
          <label className="text-sm text-slate-600">Recur day (1–28)</label>
          <input
            type="number"
            min={1}
            max={28}
            value={recurDay}
            onChange={e => setRecurDay(e.target.value ? Number(e.target.value) : '')}
            className={s.input}
            disabled={!recurring || !canWrite}
          />
        </div>

        <div className="md:col-span-6 flex items-end justify-end">
          <button className={cx(s.btn, s.primary, 'w-full sm:w-auto')} type="submit" disabled={!canWrite}>
            Add Bill
          </button>
        </div>
      </form>

      {/* ===== Mobile cards ===== */}
      <div className="grid gap-3 md:hidden">
        {items.length === 0 ? (
          <div className={cx(s.card, 'p-4 text-sm text-slate-600')}>No bills yet.</div>
        ) : (
          items.map(b => (
            <div key={b.id} className={cx(s.card, 'p-3')}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{b.category}</div>
                <div className="text-sm font-semibold">{fmtCurrency(Number(b.amount))}</div>
              </div>
              <div className="mt-1 text-xs text-slate-600">
                Due {b.due_date} • {b.recurring ? `Recurring (day ${b.recur_day ?? '-'})` : 'One-time'}
              </div>
              <div className="mt-1 text-sm">Status: {b.paid ? 'Paid' : 'Unpaid'}</div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                {canWrite ? (
                  <>
                    <button onClick={() => togglePaid(b)} className={cx(s.btn, s.secondary)}>
                      {b.paid ? 'Mark Unpaid' : 'Mark Paid'}
                    </button>
                    <button
                      onClick={() => del(b)}
                      className={cx(s.btn, s.danger)}
                      disabled={deletingId === b.id}
                    >
                      {deletingId === b.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </>
                ) : (
                  <div className="col-span-2 text-right text-slate-400">View only</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===== Desktop table ===== */}
      <div className={cx(s.card, 'hidden md:block')}>
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr>
                <th className={s.th}>Due</th>
                <th className={s.th}>Category</th>
                <th className={cx(s.th, 'text-right')}>Amount</th>
                <th className={s.th}>Recurring</th>
                <th className={s.th}>Status</th>
                <th className={cx(s.th, 'text-right')}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className={s.td} colSpan={6}>No bills yet.</td>
                </tr>
              ) : (
                items.map(b => (
                  <tr key={b.id} className="border-t hover:bg-slate-50/50">
                    <td className={cx(s.td, 'whitespace-nowrap')}>{b.due_date}</td>
                    <td className={s.td}>{b.category}</td>
                    <td className={cx(s.td, 'text-right font-semibold')}>{fmtCurrency(Number(b.amount))}</td>
                    <td className={s.td}>{b.recurring ? `Yes (day ${b.recur_day ?? '-'})` : 'No'}</td>
                    <td className={s.td}>{b.paid ? 'Paid' : 'Unpaid'}</td>
                    <td className={cx(s.td, 'text-right space-x-2')}>
                      {canWrite ? (
                        <>
                          <button onClick={() => togglePaid(b)} className={cx(s.btn, s.secondary)}>
                            {b.paid ? 'Mark Unpaid' : 'Mark Paid'}
                          </button>
                          <button
                            onClick={() => del(b)}
                            className={cx(s.btn, s.danger)}
                            disabled={deletingId === b.id}
                          >
                            {deletingId === b.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400">View only</span>
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
