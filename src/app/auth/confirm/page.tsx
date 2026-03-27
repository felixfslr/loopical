'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

function AuthConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function confirm() {
      const code = searchParams.get('code')
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type') as 'magiclink' | 'email' | 'signup' | null

      if (!code && !tokenHash) {
        setError('Kein Bestätigungscode gefunden.')
        return
      }

      const supabase = createClient()

      // PKCE flow: exchange code for session
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          router.replace('/dashboard')
          return
        }
        console.error('Code exchange failed:', error.message)
      }

      // Implicit flow: verify OTP with token_hash
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type === 'email' ? 'email' : 'magiclink',
        })
        if (!error) {
          router.replace('/dashboard')
          return
        }
        console.error('OTP verification failed:', error.message)
      }

      setError('Anmeldung fehlgeschlagen. Der Link ist möglicherweise abgelaufen.')
    }

    confirm()
  }, [searchParams, router])

  if (error) {
    return (
      <div className="flex min-h-full items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-sm text-destructive">{error}</p>
          <a
            href="/login"
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            Zurück zum Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4">
      <div className="text-center space-y-3">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Anmeldung wird bestätigt…</p>
      </div>
    </div>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center px-4">
          <div className="text-center space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Anmeldung wird bestätigt…</p>
          </div>
        </div>
      }
    >
      <AuthConfirmContent />
    </Suspense>
  )
}
