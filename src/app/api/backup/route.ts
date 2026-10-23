import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { dbFile } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const file = dbFile()
  const buf = await readFile(file)
  const name = `mining-backup-${new Date().toISOString().slice(0, 10)}.db`
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/x-sqlite3',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  })
}
