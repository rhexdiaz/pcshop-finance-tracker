import { useEffect, useMemo, useState } from 'react'
import { formatISO } from 'date-fns'
import { supabase } from '../lib/supabaseClient'
import { fmtCurrency } from '../lib/currency'
import { useSession } from '../lib/session'
import { styles as s, cx } from '../ui'

type TxType = 'income' | 'expense' | 'savings'
type Tx = { id: string; date: string; type: TxType; category: string; amount: number; note?: string }

const CATS: Record<TxType, string[]> = {
  income: ['PisoNet', 'Water Refilling', 'Printing', 'Other'],
  expense: ['Salaries', 'Foods', 'Business Permit', 'Other'],
  savings: ['Emergency Fund', 'Store Upgrade', 'Marketing Fund', 'New Tools', 'Other'],
}

export default function Transactions() {
  const { profile } = useSession()
  const canWrite = profile?.role === 'admin' || profile?.role === 'editor'

  const [items, setItems] = useState<Tx[]>([])
  const [type, setType] = useState<TxType>('income')
  const [date, setDate] = useState<string>(formatISO(new Date(), { representation: 'date' }))
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATS['income'][0])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search
  const [q, setQ] = useState('')

  // NEW: Inline amount edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState<string>('')
  const [savingEdit, setSavingEdit] = useState(false)

  const valid = Number(amount) > 0 && !!date && !!category

  const refresh = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .limit(200)
    setLoading(false)
    if (error) return setError(error.message)
    setItems((data || []) as Tx[])
  }

  useEffect(() => { refresh() }, [])
  useEffect(() => { setCategory(CATS[type][0]) }, [type])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!canWrite) return setError('You do not have permission to add transactions.')
    const amt = Number(amount)
    if (!valid) return setError('Please enter a positive amount.')
    const { error } = await supabase.from('transactions').insert({ date, type, category, amount: amt, note })
    if (error) return setError(error.message)
    setAmount(''); setNote('')
    refresh()
  }

  const del = async (id: string) => {
    if (!canWrite) return
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) setItems((prev) => prev.filter((x) => x.id !== id))
  }

  // NEW: start/cancel/save inline edit
  const startEdit = (row: Tx) => {
    if (!canWrite) return
    setEditingId(row.id)
    setEditAmount(String(row.amount ?? ''))
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditAmount('')
  }

  const saveEdit = async (row: Tx) => {
    if (!canWrite) return
    const newAmt = Number(editAmount)
    if (!Number.isFinite(newAmt) || newAmt <= 0) {
      setError('Amount must be a positive number.')
      return
    }

    setSavingEdit(true)
    const prev = items
    // optimistic render
    setItems(prev => prev.map(r => r.id === row.id ? { ...r, amount: newAmt } : r))

    const { error } = await supabase.from('transactions').update({ amount: newAmt }).eq('id', row.id)
    setSavingEdit(false)

    if (error) {
      setError(error.message)
      setItems(prev) // rollback
      return
    }

    setEditingId(null)
    setEditAmount('')
  }

  // Client-side filtering (category, note, type)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return items
    return items.filter((t) => {
      const hay = `${t.category} ${t.note ?? ''} ${t.type}`.toLowerCase()
      return hay.includes(term)
    })
  }, [items, q])

  return (
    <section className="grid gap-6">
      {!canWrite && (
        <div className={cx(s.alert, 'border-amber-200 bg-amber-50 text-amber-800')}>
          Read-only access. Ask an admin to upgrade your role to <span className="font-medium">Editor</span> if you need to add or delete transactions.
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={add}
        className={cx(s.card, 'grid grid-cols-1 gap-3 p-4 md:grid-cols-6')}
        aria-disabled={!canWrite}
      >
        <div>
          <label className="text-sm text-slate-600">Type</label>
          <select value={type} onChange={(e)=>setType(e.target.value as TxType)} className={s.select} disabled={!canWrite}>
            {(['income','expense','savings'] as const).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-slate-600">Date</label>
          <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className={s.input} disabled={!canWrite}/>
        </div>
        <div>
          <label className="text-sm text-slate-600">Amount</label>
          <input type="number" step="0.01" value={amount} onChange={(e)=>setAmount(e.target.value)} className={s.input} placeholder="e.g., 1500" disabled={!canWrite}/>
        </div>
        <div>
          <label className="text-sm text-slate-600">Category</label>
          <select value={category} onChange={(e)=>setCategory(e.target.value)} className={s.select} disabled={!canWrite}>
            {CATS[type].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-slate-600">Note</label>
          <input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="details…" className={s.input} disabled={!canWrite}/>
        </div>
        <div className="md:col-span-6 flex items-end justify-end gap-2">
          {error && <span className="mr-auto text-sm text-rose-700">{error}</span>}
          <button type="submit" disabled={!valid || !canWrite} className={cx(s.btn, s.primary, 'w-full sm:w-auto')}>
            Add
          </button>
        </div>
      </form>

      {/* Search bar */}
      <div className={cx(s.card, 'p-3 sm:p-4')}>
        <label className="mb-1 block text-sm text-slate-600">Search</label>
        <input
          className={s.input}
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          placeholder="Find by category, note, or type…"
        />
      </div>

      {/* ===== Mobile cards ===== */}
      <div className="grid gap-3 md:hidden">
        {loading ? (
          <div className={cx(s.card, 'p-4 text-sm text-slate-600')}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className={cx(s.card, 'p-4 text-sm text-slate-600')}>No matching entries.</div>
        ) : (
          filtered.map((row) => {
            const isEditing = editingId === row.id
            return (
              <div key={row.id} className={cx(s.card, 'p-3')}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{row.category}</div>
                  {isEditing ? (
                    <input
                      className={cx(s.input, 'w-28 text-right')}
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(e)=>setEditAmount(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <div
                      className={cx(
                        'text-sm font-semibold',
                        row.type === 'income' ? 'text-emerald-700' : row.type === 'expense' ? 'text-rose-700' : 'text-indigo-700'
                      )}
                    >
                      {fmtCurrency(Number(row.amount))}
                    </div>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {row.date} • {row.type}
                </div>
                {row.note && <div className="mt-1 text-sm">{row.note}</div>}

                <div className="mt-2 grid grid-cols-2 gap-2">
                  {canWrite ? (
                    isEditing ? (
                      <>
                        <button
                          onClick={()=>saveEdit(row)}
                          className={cx(s.btn, s.primary, 'w-full')}
                          disabled={savingEdit}
                        >
                          {savingEdit ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={cancelEdit} className={cx(s.btn, s.secondary, 'w-full')}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={()=>startEdit(row)} className={cx(s.btn, s.secondary, 'w-full')}>
                          Edit
                        </button>
                        <button onClick={()=>del(row.id)} className={cx(s.btn, s.danger, 'w-full')}>
                          Delete
                        </button>
                      </>
                    )
                  ) : (
                    <div className="col-span-2 text-right text-slate-400">View only</div>
                  )}
                </div>
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
                <th className={s.th}>Date</th>
                <th className={s.th}>Type</th>
                <th className={s.th}>Category</th>
                <th className={s.th}>Note</th>
                <th className={cx(s.th, 'text-right')}>Amount</th>
                <th className={cx(s.th, 'text-right')}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className={s.td} colSpan={6}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className={s.td} colSpan={6}>No matching entries.</td></tr>
              ) : (
                filtered.map(row => {
                  const isEditing = editingId === row.id
                  return (
                    <tr key={row.id} className="border-t hover:bg-slate-50/50">
                      <td className={cx(s.td, 'whitespace-nowrap')}>{row.date}</td>
                      <td className={s.td}>{row.type}</td>
                      <td className={s.td}>{row.category}</td>
                      <td className={s.td}>{row.note}</td>

                      <td className={cx(s.td, 'text-right align-middle')}>
                        {isEditing ? (
                          <input
                            className={cx(s.input, 'w-28 text-right')}
                            type="number"
                            step="0.01"
                            value={editAmount}
                            onChange={(e)=>setEditAmount(e.target.value)}
                            autoFocus
                          />
                        ) : (
                          <span
                            className={cx(
                              'font-semibold',
                              row.type === 'income' ? 'text-emerald-700' : row.type === 'expense' ? 'text-rose-700' : 'text-indigo-700'
                            )}
                          >
                            {fmtCurrency(Number(row.amount))}
                          </span>
                        )}
                      </td>

                      <td className={cx(s.td, 'text-right')}>
                        {canWrite ? (
                          isEditing ? (
                            <div className="inline-flex gap-2">
                              <button
                                onClick={()=>saveEdit(row)}
                                disabled={savingEdit}
                                className={cx(s.btn, s.primary)}
                                type="button"
                              >
                                {savingEdit ? 'Saving…' : 'Save'}
                              </button>
                              <button onClick={cancelEdit} type="button" className={cx(s.btn, s.secondary)}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-2">
                              <button onClick={()=>startEdit(row)} type="button" className={cx(s.btn, s.secondary)}>
                                Edit
                              </button>
                              <button onClick={()=>del(row.id)} className={cx(s.btn, s.danger)} type="button">
                                Delete
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="text-slate-400">View only</span>
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
