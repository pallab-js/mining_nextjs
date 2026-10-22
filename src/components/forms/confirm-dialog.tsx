'use client'
/** ConfirmDialog — modal for destructive actions. */
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  description = 'Are you sure?',
  confirmLabel = 'Delete',
  confirmTone = 'bad',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: string
  confirmLabel?: string
  confirmTone?: 'bad' | 'warn'
}) {
  const [key] = useState(0)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div key={key} className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="fixed inset-0 bg-canvas/75 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-lg border border-line bg-panel shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-2.5">
          <div>
            <h2 className="text-[13px] font-medium">{title}</h2>
            {description && (
              <p className="mt-0.5 text-[11px] text-ink-dim">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring shrink-0 rounded p-2 text-ink-dim hover:text-ink min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="p-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-md border border-line bg-panel px-4 py-2 text-[12px] hover:border-ink-dim/50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`focus-ring rounded-md px-4 py-2 text-[12px] min-h-[44px] ${
              confirmTone === 'bad'
                ? 'border-bad/40 bg-bad/10 text-bad hover:bg-bad/20'
                : 'border-warn/40 bg-warn/10 text-warn hover:bg-warn/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}