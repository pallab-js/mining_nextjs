'use client'
/**
 * DataTable — sortable, paginated dense table for the control room.
 * Columns declare how to render + how to sort; rows are plain objects.
 */
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  align?: 'left' | 'right'
  render: (row: T) => React.ReactNode
  /** value used for sorting; omit to make the column unsortable */
  sortValue?: (row: T) => string | number | null | undefined
  width?: string
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  pageSize = 25,
  emptyState,
  dense = false,
}: {
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string | number
  pageSize?: number
  emptyState?: React.ReactNode
  dense?: boolean
}) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sortValue) return rows
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      if (av === bv) return 0
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [rows, columns, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const visible = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize)

  if (rows.length === 0 && emptyState) {
    return <div className="rounded-lg border border-line bg-panel">{emptyState}</div>
  }

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
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
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={`label-micro focus-ring inline-flex items-center gap-1 rounded hover:text-ink ${
                          active ? 'text-ink' : ''
                        }`}
                      >
                        {c.header}
                        {active &&
                          (sortDir === 'asc' ? (
                            <ChevronUp className="size-3" />
                          ) : (
                            <ChevronDown className="size-3" />
                          ))}
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
            {visible.map((row) => (
              <tr key={getRowKey(row)} className="border-b border-line/60 last:border-0 hover:bg-panel-2">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`${pad} ${c.align === 'right' ? 'num text-right' : ''} text-ink`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(sorted.length > pageSize || pageCount > 1) && (
        <div className="flex items-center justify-between border-t border-line px-4 py-2">
          <span className="num text-[11px] text-ink-dim">
            {sorted.length.toLocaleString('en-US')} rows
          </span>
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
