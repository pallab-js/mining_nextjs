'use client'
/** KeyboardShortcuts — press ? to show overlay with key bindings. */
import { useEffect, useState } from 'react'
import { X, HelpCircle } from 'lucide-react'

interface Shortcut {
  keys: string
  description: string
}

const SHORTCUTS: { category: string; items: Shortcut[] }[] = [
  {
    category: 'Navigation',
    items: [
      { keys: 'G O', description: 'Overview dashboard' },
      { keys: 'G E', description: 'Equipment & Fleet' },
      { keys: 'G S', description: 'Sites & Mines' },
      { keys: 'G P', description: 'Production & Grades' },
      { keys: 'G I', description: 'Inventory' },
      { keys: 'G T', description: 'Safety (HSE)' },
      { keys: 'G N', description: 'Environment' },
      { keys: 'G M', description: 'Import Wizard' },
      { keys: 'G A', description: 'Settings' },
    ],
  },
  {
    category: 'Actions',
    items: [
      { keys: '/', description: 'Focus site filter' },
      { keys: 'N', description: 'New record (contextual)' },
      { keys: '?', description: 'Show this help' },
      { keys: 'Esc', description: 'Close dialog / drawer' },
    ],
  },
  {
    category: 'Tables',
    items: [
      { keys: '← / →', description: 'Navigate pages' },
      { keys: 'Click header', description: 'Sort column' },
    ],
  },
]

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return
      }
      if (e.key === '?' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <button
        type="button"
        aria-label="Close shortcuts"
        onClick={() => setOpen(false)}
        className="fixed inset-0 bg-canvas/75 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-2xl rounded-lg border border-line bg-panel shadow-2xl max-h-[80vh] overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="size-5 text-signal" />
            <h2 className="text-[15px] font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="focus-ring shrink-0 rounded p-2 text-ink-dim hover:text-ink min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {SHORTCUTS.map((section) => (
            <div key={section.category} className="mb-6">
              <h3 className="mb-2 text-[11px] tracking-wide text-ink-dim uppercase">{section.category}</h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12.5px]">
                {section.items.map((item) => (
                  <div key={item.keys} className="flex items-center gap-2">
                    <kbd className="inline-flex items-center gap-1 rounded border border-line bg-panel-2 px-1.5 py-0.5 text-[10px] font-mono text-ink-dim">
                      {item.keys
                        .split(' ')
                        .map((k) => (k === 'Esc' ? 'Esc' : k))
                        .join(' + ')}
                    </kbd>
                    <dd className="text-ink">{item.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}