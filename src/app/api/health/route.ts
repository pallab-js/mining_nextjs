import { NextResponse } from 'next/server'
import { getFreshness } from '@/lib/queries/meta'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const f = await getFreshness()
    return NextResponse.json({ ok: true, freshness: f })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
