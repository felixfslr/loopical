'use client'

import { useActionState } from 'react'
import { loginWithEmail, loginWithPassword } from './actions'
import { Button } from '@/components/ui/button'
import { Mail, LogIn } from 'lucide-react'

export default function LoginPage() {
  const [magicLinkState, magicLinkAction, magicLinkPending] = useActionState(
    loginWithEmail,
    { error: null, success: false },
  )

  const [demoState, demoAction, demoPending] = useActionState(
    loginWithPassword,
    { error: null },
  )

  return (
    <div className="flex min-h-full items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Loopical</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Voice-first Feedback für deine Projekte
          </p>
        </div>

        {/* Demo Login */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground mb-3 text-center">
            Demo-Account zum Testen
          </p>
          <form action={demoAction}>
            <input type="hidden" name="email" value="demo@loopical.app" />
            <input type="hidden" name="password" value="demo1234" />
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={demoPending}
            >
              <LogIn className="mr-2 h-4 w-4" />
              {demoPending ? 'Wird angemeldet...' : 'Als Demo-User einloggen'}
            </Button>
          </form>
          {demoState.error && (
            <p className="text-sm text-destructive mt-2 text-center">
              {demoState.error}
            </p>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Oder per E-Mail
            </span>
          </div>
        </div>

        {/* Email Magic Link */}
        {magicLinkState.success ? (
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-center text-sm text-green-400">
            <Mail className="mx-auto mb-2 h-6 w-6" />
            Wir haben dir einen Magic Link geschickt. Schau in dein Postfach!
          </div>
        ) : (
          <form action={magicLinkAction} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-muted-foreground mb-1.5"
              >
                E-Mail-Adresse
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="du@beispiel.de"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {magicLinkState.error && (
              <p className="text-sm text-destructive">
                {magicLinkState.error}
              </p>
            )}

            <Button
              type="submit"
              variant="outline"
              className="w-full"
              size="lg"
              disabled={magicLinkPending}
            >
              {magicLinkPending ? 'Wird gesendet...' : 'Magic Link senden'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
