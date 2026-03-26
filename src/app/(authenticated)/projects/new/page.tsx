'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createProject } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
]

export default function NewProjectPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(createProject, {
    error: null,
    projectId: null,
  })

  useEffect(() => {
    if (state.projectId) {
      router.push(`/projects/${state.projectId}`)
    }
  }, [state.projectId, router])

  return (
    <div className="max-w-lg">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-6">
        Neues Projekt erstellen
      </h1>

      <form action={formAction} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Projektname</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="z.B. Website Redesign"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Beschreibung (optional)</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Worum geht es in diesem Projekt?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Farbe</Label>
          <div className="flex gap-2">
            {COLORS.map((color) => (
              <label key={color} className="cursor-pointer">
                <input
                  type="radio"
                  name="color"
                  value={color}
                  defaultChecked={color === '#6366f1'}
                  className="peer sr-only"
                />
                <div
                  className="h-8 w-8 rounded-full ring-2 ring-transparent peer-checked:ring-foreground ring-offset-2 ring-offset-background transition-all"
                  style={{ backgroundColor: color }}
                />
              </label>
            ))}
          </div>
        </div>

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Wird erstellt...' : 'Projekt erstellen'}
        </Button>
      </form>
    </div>
  )
}
