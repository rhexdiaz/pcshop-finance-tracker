export const CURRENCY = (import.meta.env.VITE_CURRENCY as string) || 'PHP';

export const fmtCurrency = (n: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY }).format(Number(n || 0));
