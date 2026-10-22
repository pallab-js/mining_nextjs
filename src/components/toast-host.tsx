'use client'
/**
 * ToastHost — transient confirmation banner for mutations.
 * Forms dispatch a `comc:toast` window event; the host renders it briefly.
 */
import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, X, AlertCircle } from 'lucide-react'

type ToastTone = 'good' | 'bad' | 'warn'

interface Toast {
  id: number
  tone: ToastTone
  text: string
  duration?: number
  action?: { label: string; onClick: () => void }
  persist?: boolean
}

const MAX_TOASTS = 5

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    let counter = 0
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<Toast>).detail
      const text = detail?.text
      if (!text) return
      counter += 1
      const id = counter
      // Spread detail first, then override with our id
      const toast: Toast = { ...detail, id }
      setToasts((t) => {
        const next = [...t, toast]
        if (next.length > MAX_TOASTS) next.shift()
        return next
      })
      if (!detail.persist && (detail.duration ?? 4000) > 0) {
        window.setTimeout(() => {
          setToasts((t) => t.filter((x) => x.id !== id))
        }, detail.duration ?? 4000)
      }
    }
    window.addEventListener('comc:toast', onToast)
    return () => window.removeEventListener('comc:toast', onToast)
  }, [])

  if (toasts.length === 0) return null

  const getIcon = (tone: ToastTone) => {
    switch (tone) {
      case 'good':
        return <CheckCircle2 className="mt-px size-4 shrink-0" />
      case 'bad':
        return <AlertTriangle className="mt-px size-4 shrink-0" />
      case 'warn':
        return <AlertCircle className="mt-px size-4 shrink-0" />
    }
  }

  const getStyles = (tone: ToastTone) => {
    switch (tone) {
      case 'good':
        return 'border-good/40 bg-good/10 text-good'
      case 'bad':
        return 'border-bad/40 bg-bad/10 text-bad'
      case 'warn':
        return 'border-warn/40 bg-warn/10 text-warn'
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col-reverse gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2 rounded-md border px-3 py-2 text-[11.5px] shadow-lg backdrop-blur animate-slide-in ${getStyles(t.tone)}`}
        >
          {getIcon(t.tone)}
          <span className="flex-1">{t.text}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.onClick()
                setToasts((all) => all.filter((x) => x.id !== t.id))
              }}
              className="shrink-0 px-2 py-0.5 text-[10px] font-medium underline hover:no-underline min-h-[44px] flex items-center"
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
            className="shrink-0 opacity-70 hover:opacity-100 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

/** Fire a toast from any client component. */
export function toast(
  text: string,
  tone: ToastTone = 'good',
  options?: { duration?: number; action?: { label: string; onClick: () => void }; persist?: boolean }
) {
  window.dispatchEvent(
    new CustomEvent('comc:toast', {
      detail: { tone, text, ...options },
    })
  )
}
