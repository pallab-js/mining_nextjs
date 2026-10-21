'use client'
/**
 * StatusControl — fleet status control for /equipment.
 * Picks a unit + target status and applies it through the setEquipmentStatus
 * server action (ActionResult contract, never throws).
 */
import { useState, useTransition } from 'react'
import { setEquipmentStatus } from '@/lib/actions/equipment'
import { EQUIPMENT_STATUSES } from '@/lib/enums'
import { enumOptions } from '@/lib/forms'

const inputClass =
  'w-full rounded-md border border-line bg-canvas px-3 py-2 text-[12.5px] text-ink outline-none focus:ring-1 focus:ring-signal/40 min-h-[44px]'

export interface StatusUnit {
  id: number
  code: string
  name: string
  status: string
}

export function StatusControl({ units }: { units: StatusUnit[] }) {
  const [unitId, setUnitId] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const apply = () => {
    if (!unitId || !status) {
      setMsg({ ok: false, text: 'Pick a unit and a status first.' })
      return
    }
    const fd = new FormData()
    fd.set('equipment_id', unitId)
    fd.set('status', status)
    setMsg(null)
    startTransition(async () => {
      const res = await setEquipmentStatus(fd)
      setMsg({ ok: res.ok, text: res.message })
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] text-ink-dim" htmlFor="status-unit">
            Unit
          </label>
          <select
            id="status-unit"
            className={`${inputClass} cursor-pointer`}
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
          >
            <option value="">—</option>
            {units.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.code} — {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-ink-dim" htmlFor="status-target">
            Status
          </label>
          <select
            id="status-target"
            className={`${inputClass} cursor-pointer`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">—</option>
            {enumOptions(EQUIPMENT_STATUSES).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {msg && (
        <p
          className={`rounded-md border px-3 py-2 text-[11px] ${
            msg.ok
              ? 'border-good/40 bg-good/10 text-good'
              : 'border-bad/40 bg-bad/10 text-bad'
          }`}
        >
          {msg.text}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={apply}
          disabled={pending}
          className="focus-ring rounded-md border border-line bg-panel px-4 py-2 text-[12px] hover:border-ink-dim/50 disabled:opacity-50 min-h-[44px]"
        >
          {pending ? 'Applying…' : 'Apply status'}
        </button>
      </div>
    </div>
  )
}
