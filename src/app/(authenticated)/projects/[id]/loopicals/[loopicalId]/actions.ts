'use server'

import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { LoopicalStatus } from '@/lib/types/database'

export async function updateLoopicalStatus(
  loopicalId: string,
  projectId: string,
  status: LoopicalStatus,
) {
  await requireUser()
  const supabase = await createClient()

  const { error } = await supabase
    .from('loopicals')
    .update({ status })
    .eq('id', loopicalId)

  if (error) {
    return { error: 'Status konnte nicht aktualisiert werden.' }
  }

  revalidatePath(`/projects/${projectId}/loopicals/${loopicalId}`)
  return { error: null }
}

export async function deleteLoopical(loopicalId: string, projectId: string) {
  await requireUser()
  const supabase = await createClient()

  const { error } = await supabase
    .from('loopicals')
    .delete()
    .eq('id', loopicalId)

  if (error) {
    return { error: 'Loopical konnte nicht gelöscht werden.' }
  }

  revalidatePath(`/projects/${projectId}`)
  return { error: null }
}

export async function toggleActionItem(
  entryId: string,
  itemIndex: number,
  projectId: string,
  loopicalId: string,
) {
  await requireUser()
  const supabase = await createClient()

  // Fetch current action items
  const { data: entry } = await supabase
    .from('feedback_entries')
    .select('action_items')
    .eq('id', entryId)
    .single()

  if (!entry?.action_items) return { error: 'Nicht gefunden.' }

  const items = entry.action_items as { text: string; done: boolean }[]
  if (itemIndex < 0 || itemIndex >= items.length) return { error: 'Ungültiger Index.' }

  items[itemIndex].done = !items[itemIndex].done

  const { error } = await supabase
    .from('feedback_entries')
    .update({ action_items: items })
    .eq('id', entryId)

  if (error) return { error: 'Konnte nicht aktualisiert werden.' }

  revalidatePath(`/projects/${projectId}/loopicals/${loopicalId}`)
  return { error: null }
}

export async function addComment(
  prevState: { error: string | null; success: boolean },
  formData: FormData,
) {
  const user = await requireUser()
  const supabase = await createClient()

  const feedbackEntryId = formData.get('feedbackEntryId') as string
  const text = formData.get('text') as string
  const projectId = formData.get('projectId') as string
  const loopicalId = formData.get('loopicalId') as string

  if (!text?.trim()) {
    return { error: 'Bitte gib einen Kommentar ein.', success: false }
  }

  const { error } = await supabase.from('comments').insert({
    feedback_entry_id: feedbackEntryId,
    author_id: user.id,
    text: text.trim(),
  })

  if (error) {
    return { error: 'Kommentar konnte nicht erstellt werden.', success: false }
  }

  revalidatePath(`/projects/${projectId}/loopicals/${loopicalId}`)
  return { error: null, success: true }
}
