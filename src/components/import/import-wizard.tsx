'use client'
/**
 * ImportWizard — pick an entity, hand over a CSV, review the validation report,
 * then commit. The payload never leaves the browser between steps: the file is
 * posted once to validate and again to commit, so the server stays stateless.
 */
import { useRef, useState, useTransition } from 'react'
import { Download, FileUp, Loader2, TriangleAlert, Upload } from 'lucide-react'
import { commitImport, validateImport, type ImportResult } from '@/lib/actions/import'
import { IMPORT_ENTITIES, type ImportEntity } from '@/lib/enums'
import {
  IMPORT_LABELS,
  TEMPLATE_HEADERS,
  templateCsv,
  type ImportReport,
} from '@/lib/import-templates'
import { toast } from '@/components/toast-host'

const inputClass =
  'w-full rounded-md border border-line bg-canvas px-3 py-2 text-[12.5px] text-ink outline-none focus:ring-1 focus:ring-signal/40 placeholder:text-ink-dim/50 min-h-[44px]'

const ENTITY_HINTS: Record<ImportEntity, string> = {
  production: 'Daily ore, waste, concentrate and grades — upserts on site + date',
  equipment_events: 'Running hours, downtime and fuel — upserts on unit + date',
  safety: 'Incidents and near misses — appends to the register',
  environment: 'Water, energy, CO₂e and tailings level — upserts on site + date',
  shipments: 'Outbound loads with status, ETA and price — appends',
}

export function ImportWizard() {
  const [entity, setEntity] = useState<ImportEntity>('production')
  const [text, setText] = useState('')
  const [filename, setFilename] = useState('')
  const [report, setReport] = useState<ImportReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [committing, startCommit] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const blob = new Blob([templateCsv(entity)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${entity}-template.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const reset = (next?: ImportEntity) => {
    if (next) setEntity(next)
    setReport(null)
    setError(null)
  }

  const buildPayload = (): FormData | null => {
    const fd = new FormData()
    fd.set('entity', entity)
    const file = fileRef.current?.files?.[0]
    if (file && file.size > 0) fd.set('file', file)
    else if (text.trim() !== '') fd.set('text', text)
    else {
      setError('Choose a CSV file or paste CSV text first.')
      return null
    }
    return fd
  }

  const pickFile = (f: File | null) => {
    setFilename(f?.name ?? '')
    setReport(null)
    setError(null)
    if (f) setText('')
  }

  const run = (mode: 'validate' | 'commit') => {
    const fd = buildPayload()
    if (!fd) return
    setError(null)
    const start = mode === 'validate' ? startTransition : startCommit
    start(async () => {
      const res: ImportResult =
        mode === 'validate' ? await validateImport(fd) : await commitImport(fd)
      if (res.report) setReport(res.report)
      if (!res.ok) {
        setError(res.message)
        toast(res.message, 'bad')
      } else {
        toast(res.message, 'good')
        if (mode === 'commit' && fileRef.current) fileRef.current.value = ''
      }
    })
  }

  const busy = pending || committing
  const canCommit = !!report && !report.fatal && report.valid > 0 && !report.committed

  return (
    <div className="space-y-4">
      {/* step 1 — entity */}
      <section>
        <h2 className="mb-2 text-[11px] tracking-wide text-ink-dim uppercase">1 · What are you importing?</h2>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {IMPORT_ENTITIES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                reset(e)
                setText('')
                setFilename('')
                if (fileRef.current) fileRef.current.value = ''
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault()
                  ev.currentTarget.click()
                }
              }}
              className={`focus-ring rounded-md border px-3 py-2 text-left transition-colors min-h-[44px] ${
                entity === e
                  ? 'border-signal/60 bg-signal/10'
                  : 'border-line bg-panel hover:border-ink-dim/50'
              }`}
            >
              <span className="block text-[12.5px] font-medium">{IMPORT_LABELS[e]}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-ink-dim">
                {ENTITY_HINTS[e]}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* step 2 — payload */}
      <section className="rounded-md border border-line bg-panel-2/40 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[11px] tracking-wide text-ink-dim uppercase">2 · Provide the data</h2>
          <button
            type="button"
            onClick={downloadTemplate}
            className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-[11.5px] hover:border-ink-dim/50 min-h-[44px]"
          >
            <Download className="size-4" />
            Download {entity.replace('_', ' ')} template
          </button>
        </div>
        <p className="mb-2 text-[11px] text-ink-dim">
          Expected columns (order does not matter, names are matched loosely):{' '}
          <span className="font-mono text-[10.5px]">{TEMPLATE_HEADERS[entity].join(', ')}</span>
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] text-ink-dim" htmlFor="import-file">
              CSV file (max 5 MB)
            </label>
            <input
              id="import-file"
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              className="block w-full cursor-pointer rounded-md border border-line bg-canvas px-2.5 py-1.5 text-[12px] text-ink-dim file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-panel file:px-2 file:py-1 file:text-[11.5px] file:text-ink"
            />
            {filename && <p className="mt-1 text-[10.5px] text-ink-dim">Selected: {filename}</p>}
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-ink-dim" htmlFor="import-text">
              …or paste CSV text
            </label>
            <textarea
              id="import-text"
              rows={4}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setReport(null)
                setError(null)
                if (e.target.value.trim() !== '' && fileRef.current) fileRef.current.value = ''
              }}
              placeholder={`${TEMPLATE_HEADERS[entity].join(',')}\n…`}
              className={`${inputClass} resize-y font-mono text-[11.5px]`}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => run('validate')}
            disabled={busy}
            className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-4 py-2 text-[12px] hover:border-ink-dim/50 disabled:opacity-50 min-h-[44px]"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
            {pending ? 'Validating…' : 'Validate'}
          </button>
        </div>
      </section>

      {/* step 3 — report */}
      {(report || error) && (
        <section className="rounded-md border border-line bg-panel-2/40 p-3">
          <h2 className="mb-2 text-[11px] tracking-wide text-ink-dim uppercase">3 · Validation report</h2>
          {report && (
            <div className="mb-2 flex flex-wrap items-center gap-3 text-[12px]">
              <span className="num">
                {report.valid} / {report.total} rows valid
              </span>
              <span className={report.errorCount > 0 ? 'text-bad' : 'text-ink-dim'}>
                {report.errorCount} row error{report.errorCount === 1 ? '' : 's'}
              </span>
              <span className="text-ink-dim">{IMPORT_LABELS[report.entity]}</span>
              {report.committed && (
                <span className="text-good">committed · {report.inserted} written</span>
              )}
            </div>
          )}
          {error && (
            <p className="flex items-start gap-2 rounded-md border border-bad/40 bg-bad/10 px-2.5 py-1.5 text-[11.5px] text-bad">
              <TriangleAlert className="mt-px size-3.5 shrink-0" />
              {error}
            </p>
          )}
          {report && report.errors.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-md border border-line">
              <table className="w-full text-[11.5px]">
                <thead className="bg-panel text-ink-dim">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium">Line</th>
                    <th className="px-3 py-1.5 text-left font-medium">Column</th>
                    <th className="px-3 py-1.5 text-left font-medium">Problem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {report.errors.map((e, i) => (
                    <tr key={`${e.line}-${i}`}>
                      <td className="num px-3 py-1.5 text-ink-dim">{e.line}</td>
                      <td className="px-3 py-1.5 text-ink-dim">{e.column || '—'}</td>
                      <td className="px-3 py-1.5">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.errorCount > report.errors.length && (
                <p className="border-t border-line px-3 py-1.5 text-[11px] text-ink-dim">
                  Showing the first {report.errors.length} of {report.errorCount} errors — fix these
                  and re-validate.
                </p>
              )}
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => run('commit')}
              disabled={busy || !canCommit}
              className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-signal/50 bg-signal/15 px-4 py-2 text-[12px] text-ink hover:bg-signal/25 disabled:opacity-40 min-h-[44px]"
            >
              {committing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {committing
                ? 'Importing…'
                : report?.committed
                  ? 'Imported'
                  : `Import ${report?.valid ?? 0} valid row${report?.valid === 1 ? '' : 's'}`}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
