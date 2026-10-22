'use client'
/**
 * DataAdmin — destructive data management with typed confirmation.
 * Reseeding and resetting both demand the operator type the confirmation
 * word, which the server re-checks (never trust the button state alone).
 */
import { useState, useTransition } from 'react'
import { DatabaseZap, Loader2, Trash2 } from 'lucide-react'
import { resetDatabase, reseedDatabase } from '@/lib/actions/settings'
import { RESET_CONFIRM, RESEED_CONFIRM } from '@/lib/enums'
import { toast } from '@/components/toast-host'

const inputClass =
  'w-full rounded-md border border-line bg-canvas px-3 py-2 font-mono text-[12px] text-ink outline-none focus:ring-1 focus:ring-signal/40 placeholder:text-ink-dim/50 min-h-[44px]'

function ConfirmRow({
  word,
  label,
  description,
  danger,
  onRun,
  busy,
}: {
  word: string
  label: string
  description: string
  danger: boolean
  onRun: (fd: FormData) => void
  busy: boolean
}) {
  const [typed, setTyped] = useState('')
  const ready = typed.trim().toUpperCase() === word

  return (
    <div className="rounded-md border border-line bg-panel-2/30 p-3">
      <div className="mb-2">
        <p className="text-[12.5px] font-medium">{label}</p>
        <p className="mt-0.5 text-[11px] text-ink-dim">{description}</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <label className="mb-1 block text-[11px] text-ink-dim" htmlFor={`confirm-${word}`}>
            Type <span className="font-mono text-ink">{word}</span> to confirm
          </label>
          <input
            id={`confirm-${word}`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={word}
            autoComplete="off"
            className={inputClass}
          />
        </div>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => {
            const fd = new FormData()
            fd.set('confirm', typed)
            onRun(fd)
            setTyped('')
          }}
          className={`focus-ring inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-[12px] disabled:opacity-40 min-h-[44px] ${
            danger
              ? 'border-bad/50 bg-bad/10 text-bad hover:bg-bad/20'
              : 'border-line bg-panel hover:border-ink-dim/50'
          }`}
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : danger ? (
            <Trash2 className="size-3.5" />
          ) : (
            <DatabaseZap className="size-3.5" />
          )}
          {label}
        </button>
      </div>
    </div>
  )
}

export function DataAdmin() {
  const [pending, startTransition] = useTransition()
  const [which, setWhich] = useState<'reseed' | 'reset' | null>(null)

  const run = (kind: 'reseed' | 'reset', fd: FormData) => {
    setWhich(kind)
    startTransition(async () => {
      const action = kind === 'reseed' ? reseedDatabase : resetDatabase
      const res = await action(fd)
      setWhich(null)
      toast(res.message, res.ok ? 'good' : 'bad')
    })
  }

  return (
    <div className="space-y-3 p-4">
      <p className="text-[11.5px] text-ink-dim">
        Both operations run inside the app against <span className="font-mono">data/mining.db</span>{' '}
        and cannot be undone. Export a JSON snapshot first if you want a backup.
      </p>
      <ConfirmRow
        word={RESEED_CONFIRM}
        label="Reseed demo data"
        description="Deletes every record, then rebuilds the deterministic 12-month demo dataset (5 sites, 50 units, 5 alert rules)."
        danger={false}
        busy={pending && which === 'reseed'}
        onRun={(fd) => run('reseed', fd)}
      />
      <ConfirmRow
        word={RESET_CONFIRM}
        label="Reset database"
        description="Deletes every record and leaves the schema empty — the app will show empty states until you seed or import."
        danger
        busy={pending && which === 'reset'}
        onRun={(fd) => run('reset', fd)}
      />
    </div>
  )
}
