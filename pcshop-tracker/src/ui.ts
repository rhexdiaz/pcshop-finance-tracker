// src/ui.ts
export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')

export const styles = {
  // containers
  card: 'rounded-2xl border border-slate-200 bg-white shadow-sm',
  alert: 'rounded-xl border px-4 py-3 text-sm',

  // buttons
  btn: 'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none',
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 disabled:opacity-50',
  secondary: 'border border-slate-300 bg-white hover:bg-slate-50 focus:ring-4 focus:ring-slate-200',
  danger: 'border border-rose-200 text-rose-700 hover:bg-rose-50 focus:ring-4 focus:ring-rose-100',

  // form fields
  input: 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 disabled:bg-slate-50',
  select: 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 disabled:bg-slate-50',

  // table
  th: 'px-3 py-2 text-left text-slate-600 bg-slate-50',
  td: 'px-3 py-2',
}
