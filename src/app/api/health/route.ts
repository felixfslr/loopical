import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const timestamp = new Date().toISOString()

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('profiles').select('id').limit(1)

    if (error) {
      return NextResponse.json(
        { status: 'degraded', timestamp, database: 'unreachable' },
        { status: 503 },
      )
    }

    return NextResponse.json({ status: 'ok', timestamp })
  } catch {
    return NextResponse.json(
      { status: 'error', timestamp },
      { status: 500 },
    )
  }
}
