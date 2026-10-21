'use client'
/** ActionForm — generic form bound to a server action (ActionResult contract). */
import {
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from 'react'
import type { ActionResult } from '@/lib/actions/result'
import type { FieldSpec } from '@/lib/forms'
import { toast } from '@/components/toast-host'
import { useDialogClose } from './dialog-context'

const inputClass =
  'w-full rounded-md border border-line bg-canvas px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:ring-1 focus:ring-signal/40 placeholder:text-ink-dim/50'
const labelClass = 'mb-1 block text-[11px] text-ink-dim'

export function ActionForm({
  action,
  fields,
  submitLabel = 'Save',
  children,
}: {
  action: (fd: FormData) => Promise<ActionResult>
  fields: FieldSpec[]
  submitLabel?: string
  children?: ReactNode
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  const closeDialog = useDialogClose()

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = formRef.current
    if (!form) return
    const fd = new FormData(form)
    setResult(null)
    startTransition(async () => {
      let res: ActionResult
      try {
        res = await action(fd)
      } catch (err) {
        res = {
          ok: false,
          message: err instanceof Error ? err.message : 'Unexpected error — please retry.',
        }
      }
      setResult(res)
      if (res.ok) {
        form.reset()
        toast(res.message, 'good')
        closeDialog?.()
      }
    })
  }

  const err = result && !result.ok ? result.fieldErrors : undefined

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) => {
          if (f.type === 'hidden') {
            return (
              <input
                key={f.name}
                type="hidden"
                name={f.name}
                defaultValue={f.defaultValue ?? ''}
              />
            )
          }
          const fieldError = err?.[f.name]?.[0]
          const span = f.span === 2 ? 'sm:col-span-2' : ''
          return (
            <div key={f.name} className={span}>
              <label className={labelClass} htmlFor={`f-${f.name}`}>
                {f.label}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  id={`f-${f.name}`}
                  name={f.name}
                  defaultValue={f.defaultValue ?? ''}
                  placeholder={f.placeholder}
                  rows={3}
                  className={`${inputClass} resize-y`}
                />
              ) : f.type === 'select' ? (
                <select
                  id={`f-${f.name}`}
                  name={f.name}
                  defaultValue={f.defaultValue ?? ''}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">—</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`f-${f.name}`}
                  name={f.name}
                  type={f.type}
                  defaultValue={f.defaultValue ?? ''}
                  placeholder={f.placeholder}
                  step={f.step}
                  min={f.min}
                  max={f.max}
                  className={inputClass}
                />
              )}
              {f.hint && !fieldError && (
                <p className="mt-1 text-[10px] text-ink-dim">{f.hint}</p>
              )}
              {fieldError && <p className="mt-1 text-[10px] text-bad">{fieldError}</p>}
            </div>
          )
        })}
      </div>
      {children}
      {result && !result.ok && (
        <p className="rounded-md border border-bad/40 bg-bad/10 px-2.5 py-1.5 text-[11px] text-bad">
          {result.message}
        </p>
      )}
      {result && result.ok && (
        <p className="rounded-md border border-good/40 bg-good/10 px-2.5 py-1.5 text-[11px] text-good">
          {result.message}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="focus-ring rounded-md border border-line bg-panel px-3 py-1.5 text-[12px] hover:border-ink-dim/50 disabled:opacity-50"
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
