'use client'
/** FormDialog — modal wrapper for ActionForm. */
import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { DialogCloseContext } from './dialog-context'

export function FormDialog({
  label,
  title,
  description,
  children,
}: {
  label: ReactNode
  title: string
  description?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring inline-flex items-center gap-1 rounded-md border border-line bg-panel px-2.5 py-1 text-[11.5px] hover:border-ink-dim/50"
      >
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-10 pb-10">
          <button
            type="button"
            aria-label="Close dialog"
            onClick={close}
            className="fixed inset-0 bg-canvas/75 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-lg rounded-lg border border-line bg-panel shadow-2xl">
            <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-2.5">
              <div>
                <h2 className="text-[13px] font-medium">{title}</h2>
                {description && (
                  <p className="mt-0.5 text-[11px] text-ink-dim">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={close}
                className="focus-ring shrink-0 rounded p-1 text-ink-dim hover:text-ink"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              <DialogCloseContext.Provider value={close}>{children}</DialogCloseContext.Provider>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
