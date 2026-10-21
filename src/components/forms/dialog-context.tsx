'use client'
/**
 * Dialog close context — lets a form inside a FormDialog close it on success
 * without passing functions across the server/client boundary.
 */
import { createContext, useContext } from 'react'

export const DialogCloseContext = createContext<(() => void) | null>(null)

export function useDialogClose(): (() => void) | null {
  return useContext(DialogCloseContext)
}
