'use client'
/**
 * ToastHost — transient confirmation banner for mutations.
 * Forms dispatch a `comc:toast` window event; the host renders it briefly.
 */
import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, X } from 'lucide-react'

interface Toast {
  id: number
  tone: 'good' | 'bad'
  text: string
}

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    let counter = 0
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<{ tone?: 'good' | 'bad'; text?: string }>).detail
      const text = detail?.text
      if (!text) return
      counter += 1
      const id = counter
      setToasts((t) => [...t, { id, tone: detail.tone ?? 'good', text }])
      window.setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id))
      }, 4000)
    }
    window.addEventListener('comc:toast', onToast)
    return () => window.removeEventListener('comc:toast', onToast)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2 rounded-md border px-3 py-2 text-[11.5px] shadow-lg backdrop-blur ${
            t.tone === 'good'
              ? 'border-good/40 bg-good/10 text-good'
              : 'border-bad/40 bg-bad/10 text-bad'
          }`}
        >
          {t.tone === 'good' ? (
            <CheckCircle2 className="mt-px size-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
          )}
          <span className="flex-1">{t.text}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
            className="opacity-70 hover:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

/** Fire a toast from any client component. */
export function toast(text: string, tone: 'good' | 'bad' = 'good') {
  window.dispatchEvent(new CustomEvent('comc:toast', { detail: { tone, text } }))
}
