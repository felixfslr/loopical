'use server'

import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { updateProfileSchema, extractFieldErrors } from '@/lib/validations'
import type { FieldErrors } from '@/lib/validations'

export async function updateProfile(
  prevState: { error: string | null; fieldErrors?: FieldErrors; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; fieldErrors?: FieldErrors; success: boolean }> {
  const user = await requireUser()
  const admin = createAdminClient()

  const parsed = updateProfileSchema.safeParse({
    fullName: formData.get('fullName'),
  })

  if (!parsed.success) {
    return { error: null, fieldErrors: extractFieldErrors(parsed), success: false }
  }

  const { fullName } = parsed.data
  const avatarFile = formData.get('avatar') as File | null

  let avatarUrl: string | undefined

  if (avatarFile && avatarFile.size > 0) {
    const ext = avatarFile.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`

    const { error: uploadError } = await admin.storage
      .from('media')
      .upload(path, avatarFile, { upsert: true })

    if (!uploadError) {
      const {
        data: { publicUrl },
      } = admin.storage.from('media').getPublicUrl(path)
      avatarUrl = publicUrl
    }
  }

  const updateData: Record<string, string> = {}
  if (fullName !== undefined) updateData.full_name = fullName
  if (avatarUrl) updateData.avatar_url = avatarUrl

  const { error } = await admin
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)

  if (error) {
    return { error: 'Profil konnte nicht aktualisiert werden.', success: false }
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { error: null, success: true }
}
