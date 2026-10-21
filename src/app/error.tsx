'use client'
/** Root error boundary — shows the failure + lets the operator retry. */
import { useEffect } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <AlertTriangle className="mb-4 size-8 text-warn" />
      <p className="text-[14px] font-medium">Something went wrong in the operations center</p>
      <p className="mt-1 max-w-md text-[12px] text-ink-dim">
        {error.message || 'Unexpected error'}
        {error.digest && <span className="num"> (digest {error.digest})</span>}
      </p>
      <button
        type="button"
        onClick={reset}
        className="focus-ring mt-5 inline-flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-1.5 text-[12px] hover:border-ink-dim/40"
      >
        <RotateCw className="size-3.5" /> Retry
      </button>
    </div>
  )
}
