'use server'

import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateProfile(
  prevState: { error: string | null; success: boolean },
  formData: FormData,
) {
  const user = await requireUser()
  const admin = createAdminClient()

  const fullName = formData.get('fullName') as string
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
