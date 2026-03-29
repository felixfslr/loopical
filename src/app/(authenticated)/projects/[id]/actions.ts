'use server'

import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { createLoopicalSchema, updateProjectSchema, extractFieldErrors } from '@/lib/validations'
import type { FieldErrors } from '@/lib/validations'

export async function createLoopical(
  prevState: { error: string | null; fieldErrors?: FieldErrors; success: boolean },
  formData: FormData,
) {
  const user = await requireUser()
  const admin = createAdminClient()

  const projectId = formData.get('projectId') as string
  const mediaFile = formData.get('media') as File | null

  const parsed = createLoopicalSchema.safeParse({
    title: formData.get('title'),
  })

  if (!parsed.success) {
    return { error: null, fieldErrors: extractFieldErrors(parsed), success: false }
  }

  const { title } = parsed.data
  const description = (formData.get('description') as string) || null

  let mediaUrl: string | null = null

  // Upload image if provided
  if (mediaFile && mediaFile.size > 0) {
    const ext = mediaFile.name.split('.').pop()
    const path = `${projectId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await admin.storage
      .from('media')
      .upload(path, mediaFile)

    if (uploadError) {
      logger.error({ err: uploadError }, 'Media upload failed')
      return { error: 'Bild konnte nicht hochgeladen werden.', success: false }
    }

    const {
      data: { publicUrl },
    } = admin.storage.from('media').getPublicUrl(path)
    mediaUrl = publicUrl
  }

  // Get max order_index
  const { data: maxOrder } = await admin
    .from('loopicals')
    .select('order_index')
    .eq('project_id', projectId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const orderIndex = (maxOrder?.order_index ?? -1) + 1

  const { error } = await admin.from('loopicals').insert({
    project_id: projectId,
    title: title.trim(),
    description,
    media_url: mediaUrl,
    media_type: mediaUrl ? 'image' : null,
    created_by: user.id,
    order_index: orderIndex,
  })

  if (error) {
    logger.error({ err: error }, 'Create loopical failed')
    return { error: `Fehler: ${error.message}`, success: false }
  }

  revalidatePath(`/projects/${projectId}`)
  return { error: null, success: true }
}

export async function createLoopicalFromFile(formData: FormData) {
  const user = await requireUser()
  const admin = createAdminClient()

  const projectId = formData.get('projectId') as string
  const title = formData.get('title') as string
  const file = formData.get('file') as File

  if (!file || file.size === 0) {
    return { error: 'Keine Datei ausgewählt.', loopicalId: null }
  }

  // Upload file
  const ext = file.name.split('.').pop()
  const path = `${projectId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('media')
    .upload(path, file)

  if (uploadError) {
    logger.error({ err: uploadError }, 'File upload failed')
    return { error: 'Datei konnte nicht hochgeladen werden.', loopicalId: null }
  }

  const {
    data: { publicUrl },
  } = admin.storage.from('media').getPublicUrl(path)

  // Get max order_index
  const { data: maxOrder } = await admin
    .from('loopicals')
    .select('order_index')
    .eq('project_id', projectId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const orderIndex = (maxOrder?.order_index ?? -1) + 1

  const mediaType = file.type.startsWith('image/') ? 'image' : 'pdf'

  const { data, error } = await admin
    .from('loopicals')
    .insert({
      project_id: projectId,
      title: title.trim(),
      media_url: publicUrl,
      media_type: mediaType,
      created_by: user.id,
      order_index: orderIndex,
    })
    .select('id')
    .single()

  if (error) {
    logger.error({ err: error }, 'Create loopical failed')
    return { error: `Fehler: ${error.message}`, loopicalId: null }
  }

  revalidatePath(`/projects/${projectId}`)
  return { error: null, loopicalId: data.id }
}

export async function updateLoopicalAnnotation(
  loopicalId: string,
  projectId: string,
  x: number,
  y: number,
) {
  await requireUser()
  const admin = createAdminClient()

  const { error } = await admin
    .from('loopicals')
    .update({ annotation_x: x, annotation_y: y })
    .eq('id', loopicalId)
    .eq('project_id', projectId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${projectId}`)
  return { error: null }
}

export async function archiveProject(projectId: string) {
  const user = await requireUser()
  const admin = createAdminClient()

  const { error } = await admin
    .from('projects')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('owner_id', user.id)

  if (error) {
    return { error: 'Projekt konnte nicht archiviert werden.' }
  }

  revalidatePath('/dashboard')
  return { error: null }
}

export async function unarchiveProject(projectId: string) {
  const user = await requireUser()
  const admin = createAdminClient()

  const { error } = await admin
    .from('projects')
    .update({ archived_at: null })
    .eq('id', projectId)
    .eq('owner_id', user.id)

  if (error) {
    return { error: 'Projekt konnte nicht wiederhergestellt werden.' }
  }

  revalidatePath('/dashboard')
  return { error: null }
}

export async function deleteProject(projectId: string) {
  const user = await requireUser()
  const admin = createAdminClient()

  const { error } = await admin
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('owner_id', user.id)

  if (error) {
    return { error: 'Projekt konnte nicht gelöscht werden.' }
  }

  revalidatePath('/dashboard')
  return { error: null }
}

export async function updateProject(
  prevState: { error: string | null; fieldErrors?: FieldErrors; success: boolean },
  formData: FormData,
) {
  const user = await requireUser()
  const admin = createAdminClient()

  const projectId = formData.get('projectId') as string

  const parsed = updateProjectSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
  })

  if (!parsed.success) {
    return { error: null, fieldErrors: extractFieldErrors(parsed), success: false }
  }

  const { name, description } = parsed.data

  const { error } = await admin
    .from('projects')
    .update({ name: name.trim(), description: description || null })
    .eq('id', projectId)
    .eq('owner_id', user.id)

  if (error) {
    return { error: 'Projekt konnte nicht aktualisiert werden.', success: false }
  }

  revalidatePath(`/projects/${projectId}`)
  return { error: null, success: true }
}
