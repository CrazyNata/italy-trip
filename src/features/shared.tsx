import type { ReactNode } from 'react'

export const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
export const field = 'w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--ac)]'
export const button = 'rounded-xl bg-[var(--ac)] px-4 py-2 text-sm font-bold text-white hover:opacity-90'
export const subtleButton = 'rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:border-[var(--ac)]'
export function PanelTitle({ eyebrow, children, action }: { eyebrow: string; children: ReactNode; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--ac)]">{eyebrow}</p><h2 className="mt-1 font-display text-3xl font-semibold">{children}</h2></div>{action}</div>
}
export function Empty({ children }: { children: ReactNode }) { return <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-[var(--muted)]">{children}</div> }
