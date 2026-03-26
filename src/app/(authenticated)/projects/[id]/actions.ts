'use server'

import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createLoopical(
  prevState: { error: string | null; success: boolean },
  formData: FormData,
) {
  const user = await requireUser()
  const admin = createAdminClient()

  const projectId = formData.get('projectId') as string
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || null
  const mediaFile = formData.get('media') as File | null

  if (!title?.trim()) {
    return { error: 'Bitte gib einen Titel ein.', success: false }
  }

  let mediaUrl: string | null = null

  // Upload image if provided
  if (mediaFile && mediaFile.size > 0) {
    const ext = mediaFile.name.split('.').pop()
    const path = `${projectId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await admin.storage
      .from('media')
      .upload(path, mediaFile)

    if (uploadError) {
      console.error('Upload error:', uploadError)
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
    console.error('Create loopical error:', error)
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
    console.error('Upload error:', uploadError)
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
    console.error('Create loopical error:', error)
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
  prevState: { error: string | null; success: boolean },
  formData: FormData,
) {
  const user = await requireUser()
  const admin = createAdminClient()

  const projectId = formData.get('projectId') as string
  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null

  if (!name?.trim()) {
    return { error: 'Bitte gib einen Projektnamen ein.', success: false }
  }

  const { error } = await admin
    .from('projects')
    .update({ name: name.trim(), description })
    .eq('id', projectId)
    .eq('owner_id', user.id)

  if (error) {
    return { error: 'Projekt konnte nicht aktualisiert werden.', success: false }
  }

  revalidatePath(`/projects/${projectId}`)
  return { error: null, success: true }
}
