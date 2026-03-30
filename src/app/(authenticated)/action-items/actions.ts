'use server'

import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ActionItemStatus } from '@/lib/types/database'

export async function updateActionItemStatus(
  actionItemId: string,
  status: ActionItemStatus,
) {
  await requireUser()
  const admin = createAdminClient()

  const { error } = await admin
    .from('action_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', actionItemId)

  if (error) {
    return { error: 'Status konnte nicht aktualisiert werden.' }
  }

  revalidatePath('/action-items')
  return { error: null }
}

export async function updateActionItemText(
  actionItemId: string,
  text: string,
) {
  await requireUser()
  const admin = createAdminClient()

  const { error } = await admin
    .from('action_items')
    .update({ text, updated_at: new Date().toISOString() })
    .eq('id', actionItemId)

  if (error) {
    return { error: 'Text konnte nicht aktualisiert werden.' }
  }

  revalidatePath('/action-items')
  return { error: null }
}

export async function assignActionItem(
  actionItemId: string,
  assigneeId: string | null,
) {
  await requireUser()
  const admin = createAdminClient()

  const { error } = await admin
    .from('action_items')
    .update({ assignee_id: assigneeId, updated_at: new Date().toISOString() })
    .eq('id', actionItemId)

  if (error) {
    return { error: 'Zuweisung konnte nicht aktualisiert werden.' }
  }

  revalidatePath('/action-items')
  return { error: null }
}
