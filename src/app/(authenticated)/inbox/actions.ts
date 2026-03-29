'use server'

import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function markAsRead(entryId: string) {
  await requireUser()
  const admin = createAdminClient()

  const { error } = await admin
    .from('feedback_entries')
    .update({ is_read: true })
    .eq('id', entryId)

  if (error) return { error: 'Konnte nicht als gelesen markiert werden.' }

  revalidatePath('/inbox')
  return { error: null }
}

export async function markAsUnread(entryId: string) {
  await requireUser()
  const admin = createAdminClient()

  const { error } = await admin
    .from('feedback_entries')
    .update({ is_read: false })
    .eq('id', entryId)

  if (error) return { error: 'Konnte nicht als ungelesen markiert werden.' }

  revalidatePath('/inbox')
  return { error: null }
}

export async function bulkMarkAsRead(entryIds: string[]) {
  await requireUser()
  const admin = createAdminClient()

  const { error } = await admin
    .from('feedback_entries')
    .update({ is_read: true })
    .in('id', entryIds)

  if (error) return { error: 'Konnte nicht als gelesen markiert werden.' }

  revalidatePath('/inbox')
  return { error: null }
}
