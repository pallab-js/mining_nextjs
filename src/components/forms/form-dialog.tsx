'use client'
/** FormDialog — modal wrapper for ActionForm. */
import { useEffect, useRef, useState, type ReactNode } from 'react'
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
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFocusRef = useRef<HTMLDivElement>(null)

  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    // Focus first focusable element
    const timer = setTimeout(() => {
      if (firstFocusRef.current) {
        const focusable = firstFocusRef.current.querySelector<HTMLElement>(
          'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])'
        )
        focusable?.focus()
      } else if (dialogRef.current) {
        const focusable = dialogRef.current.querySelector<HTMLElement>(
          'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])'
        )
        focusable?.focus()
      }
    }, 0)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(timer)
    }
  }, [open, close])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring inline-flex items-center gap-1 rounded-md border border-line bg-panel px-3 py-1.5 text-[11.5px] hover:border-ink-dim/50 min-h-[44px]"
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
          <div
            ref={dialogRef}
            className="relative w-full max-w-lg rounded-lg border border-line bg-panel shadow-2xl"
          >
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
                className="focus-ring shrink-0 rounded p-2 text-ink-dim hover:text-ink min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </header>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              <DialogCloseContext.Provider value={close}>
                <div ref={firstFocusRef}>{children}</div>
              </DialogCloseContext.Provider>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
