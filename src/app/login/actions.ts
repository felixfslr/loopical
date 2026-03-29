'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginWithEmail(
  prevState: { error: string | null; fieldErrors?: Record<string, string>; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; fieldErrors?: Record<string, string>; success: boolean }> {
  const { loginEmailSchema, extractFieldErrors } = await import('@/lib/validations')
  const parsed = loginEmailSchema.safeParse({ email: formData.get('email') })

  if (!parsed.success) {
    return { error: null, fieldErrors: extractFieldErrors(parsed), success: false }
  }

  const { email } = parsed.data

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
    },
  })

  if (error) {
    return { error: error.message, success: false }
  }

  return { error: null, success: true }
}

export async function loginWithGoogle(): Promise<void> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function loginWithPassword(
  prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const { loginPasswordSchema } = await import('@/lib/validations')
  const parsed = loginPasswordSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email, password } = parsed.data

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
