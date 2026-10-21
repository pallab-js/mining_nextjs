/** Number/date formatting helpers — shared by KPI tiles, charts and tables. */

export function fmtInt(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return Math.round(v).toLocaleString('en-US')
}

/** 1 234 567 → '1.23M', 12 345 → '12.3k' */
export function fmtCompact(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs >= 1_000_000_000) return `${trimZeros((v / 1_000_000_000).toFixed(decimals))}B`
  if (abs >= 1_000_000) return `${trimZeros((v / 1_000_000).toFixed(decimals))}M`
  if (abs >= 10_000) return `${trimZeros((v / 1_000).toFixed(1))}k`
  return fmtInt(v)
}

function trimZeros(s: string): string {
  return s.replace(/\.?0+$/, '')
}

export function fmtNum(v: number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function fmtPct(v: number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return `${fmtNum(v, decimals)}%`
}

/** Fraction (0.023) → '+2.3%' / '−2.3%' (unicode minus for alignment) */
export function fmtDelta(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  const pct = v * 100
  const sign = pct >= 0 ? '+' : '−'
  return `${sign}${fmtNum(Math.abs(pct), 1)}%`
}

export function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `$${trimZeros((v / 1_000_000).toFixed(1))}M`
  if (abs >= 1_000) return `$${trimZeros((v / 1_000).toFixed(0))}k`
  return `$${fmtInt(v)}`
}

/** '2026-10-21' → '21 Oct 2026' */
export function fmtDay(v: string | null | undefined): string {
  if (!v) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return v
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`
}

/** '2026-W42' / '2026-10' / '2026-10-21' → short chart label */
export function fmtBucket(v: string): string {
  const wk = /^(\d{4})-W(\d{1,2})$/.exec(v)
  if (wk) return `W${wk[2]}`
  const mo = /^(\d{4})-(\d{2})$/.exec(v)
  if (mo) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[Number(mo[2]) - 1]} ${mo[0].slice(2, 4)}`
  }
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (day) return `${Number(day[3])} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(day[2]) - 1]}`
  return v
}

/** '2026-10-21T09:00:00' → '21 Oct 2026, 09:00' */
export function fmtTimestamp(v: string | null | undefined): string {
  if (!v) return '—'
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(v)
  if (m) return `${fmtDay(m[1])}, ${m[2]}`
  return fmtDay(v)
}
