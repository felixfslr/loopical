import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('feedback_entries')
    .select('processing_status')
    .eq('id', id)
    .single()

  return NextResponse.json({ status: data?.processing_status ?? 'error' })
}
