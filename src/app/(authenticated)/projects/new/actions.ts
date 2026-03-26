'use server'

import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

export async function createProject(
  prevState: { error: string | null; projectId: string | null },
  formData: FormData,
): Promise<{ error: string | null; projectId: string | null }> {
  const user = await requireUser()
  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const color = (formData.get('color') as string) || '#6366f1'

  if (!name?.trim()) {
    return { error: 'Bitte gib einen Projektnamen ein.', projectId: null }
  }

  const supabase = await createClient()

  // Debug: check if user session is available to supabase client
  const { data: sessionData } = await supabase.auth.getUser()
  console.log('Server action user:', sessionData.user?.id, 'Expected:', user.id)

  const { data, error } = await supabase
    .from('projects')
    .insert({
      owner_id: user.id,
      name: name.trim(),
      description,
      color,
      share_token: nanoid(12),
    })
    .select('id')
    .single()

  if (error) {
    console.error('Create project error:', error)
    return { error: `Fehler: ${error.message} (${error.code})`, projectId: null }
  }

  return { error: null, projectId: data.id }
}
