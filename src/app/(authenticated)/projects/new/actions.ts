'use server'

import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { nanoid } from 'nanoid'
import { logger } from '@/lib/logger'
import { createProjectSchema, extractFieldErrors } from '@/lib/validations'
import type { FieldErrors } from '@/lib/validations'

export async function createProject(
  prevState: { error: string | null; fieldErrors?: FieldErrors; projectId: string | null },
  formData: FormData,
): Promise<{ error: string | null; fieldErrors?: FieldErrors; projectId: string | null }> {
  const user = await requireUser()

  const parsed = createProjectSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    color: formData.get('color') || '#6366f1',
  })

  if (!parsed.success) {
    return { error: null, fieldErrors: extractFieldErrors(parsed), projectId: null }
  }

  const { name, description, color } = parsed.data

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('projects')
    .insert({
      owner_id: user.id,
      name: name.trim(),
      description: description || null,
      color,
      share_token: nanoid(12),
    })
    .select('id')
    .single()

  if (error) {
    logger.error({ err: error }, 'Create project failed')
    return { error: `Fehler: ${error.message}`, projectId: null }
  }

  return { error: null, projectId: data.id }
}
