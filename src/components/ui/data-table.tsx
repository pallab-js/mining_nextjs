'use client'
/**
 * DataTable — sortable, paginated dense table for the control rooms.
 * Fully serializable: columns declare a field + a display kind (no function
 * props — functions cannot cross the RSC boundary). Rows are plain objects.
 */
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge, StatusDot, type DotTone } from './status-dot'
import { fmtWith, type Fmt } from '@/lib/fmt-kinds'
import { fmtDay } from '@/lib/format'
import { humanize, toneFor } from '@/lib/tones'
import type { ViewRow } from '@/lib/view-rows'

export type { ViewRow }

export type CellKind = 'text' | 'mono' | 'dim' | 'num' | 'date' | 'badge' | 'dot'

export interface Column {
  key: string
  header: string
  align?: 'left' | 'right'
  kind?: CellKind
  /** number format when kind is 'num' */
  fmt?: Fmt
  /** tone vocabulary for 'badge'/'dot' (site/equipment/shipment/severity/incident) */
  toneKind?: string
  /** row field holding an explicit tone ('good'|'warn'|'bad'|'idle') */
  toneField?: string
  width?: string
  sortable?: boolean
}

const TONE_TEXT: Record<DotTone, string> = {
  good: 'text-good',
  warn: 'text-warn',
  bad: 'text-bad',
  idle: 'text-ink',
}

function CellView({ col, row }: { col: Column; row: ViewRow }) {
  const raw = row[col.key]
  const tone: DotTone =
    (col.toneField ? (row[col.toneField] as DotTone) : undefined) ??
    (col.toneKind ? toneFor(col.toneKind, raw === null ? null : String(raw)) : 'idle')
  switch (col.kind) {
    case 'num':
      return (
        <span className={col.toneField ? TONE_TEXT[tone] : ''}>
          {raw === null || raw === undefined ? '—' : fmtWith(col.fmt, Number(raw))}
        </span>
      )
    case 'mono':
      return <span className="num">{raw === null ? '—' : String(raw)}</span>
    case 'dim':
      return <span className="text-ink-dim">{raw === null ? '—' : String(raw)}</span>
    case 'date':
      return <span className={`num ${col.toneField ? '' : 'text-ink-dim'}`}>{fmtDay(raw === null ? null : String(raw))}</span>
    case 'badge':
      return <Badge tone={tone}>{raw === null ? '—' : humanize(String(raw))}</Badge>
    case 'dot':
      return (
        <span className="flex items-center gap-1.5">
          <StatusDot tone={tone} />
          {raw === null ? '—' : humanize(String(raw))}
        </span>
      )
    default:
      return <span>{raw === null || raw === undefined ? '—' : String(raw)}</span>
  }
}

export function DataTable({
  columns,
  rows,
  pageSize = 25,
  emptyState,
  dense = false,
}: {
  columns: Column[]
  rows: ViewRow[]
  pageSize?: number
  emptyState?: React.ReactNode
  dense?: boolean
}) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey)
    if (!col || col.sortable === false) return rows
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = a[col.key]
      const bv = b[col.key]
      if (av === bv) return 0
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [rows, columns, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const [page, setPage] = useState(0)
  const safePage = Math.min(page, pageCount - 1)
  const visible = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize)

  if (rows.length === 0 && emptyState) {
    return <div className="rounded-lg border border-line bg-panel">{emptyState}</div>
  }

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  const pad = dense ? 'px-3 py-1.5' : 'px-4 py-2'

  return (
    <div className="rounded-lg border border-line bg-panel">
      <div className="scroll-slim overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => {
                const active = sortKey === c.key
                return (
                  <th
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    className={`${pad} ${c.align === 'right' ? 'text-right' : 'text-left'} select-none`}
                  >
                    {c.sortable !== false ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={`label-micro focus-ring inline-flex items-center gap-1 rounded hover:text-ink ${
                          active ? 'text-ink' : ''
                        }`}
                      >
                        {c.header}
                        {active &&
                          (sortDir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                      </button>
                    ) : (
                      <span className="label-micro">{c.header}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={(row.id as string | number) ?? i} className="border-b border-line/60 last:border-0 hover:bg-panel-2">
                {columns.map((c) => (
                  <td key={c.key} className={`${pad} ${c.align === 'right' ? 'text-right' : ''} text-ink`}>
                    <CellView col={c} row={row} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > pageSize && (
        <div className="flex items-center justify-between border-t border-line px-4 py-2">
          <span className="num text-[11px] text-ink-dim">{sorted.length.toLocaleString('en-US')} rows</span>
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
                className="focus-ring rounded border border-line px-2 py-0.5 text-[11px] text-ink-dim hover:text-ink disabled:opacity-40"
              >
                ←
              </button>
              <span className="num text-[11px] text-ink-dim">
                {safePage + 1} / {pageCount}
              </span>
              <button
                type="button"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(safePage + 1)}
                className="focus-ring rounded border border-line px-2 py-0.5 text-[11px] text-ink-dim hover:text-ink disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
