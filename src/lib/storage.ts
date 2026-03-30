import { createClient } from '@/lib/supabase/server'

export async function uploadAudio(file: File | Blob, path: string) {
  const supabase = await createClient()
  const { error } = await supabase.storage
    .from('audio')
    .upload(path, file, { contentType: 'audio/webm' })

  if (error) throw error

  const {
    data: { publicUrl },
  } = supabase.storage.from('audio').getPublicUrl(path)

  return publicUrl
}

export async function uploadImage(file: File, path: string) {
  const supabase = await createClient()
  const { error } = await supabase.storage
    .from('media')
    .upload(path, file)

  if (error) throw error

  const {
    data: { publicUrl },
  } = supabase.storage.from('media').getPublicUrl(path)

  return publicUrl
}

export async function uploadMedia(file: File | Blob, path: string, contentType?: string) {
  const supabase = await createClient()
  const options = contentType ? { contentType } : undefined
  const { error } = await supabase.storage
    .from('media')
    .upload(path, file, options)

  if (error) throw error

  const {
    data: { publicUrl },
  } = supabase.storage.from('media').getPublicUrl(path)

  return publicUrl
}
