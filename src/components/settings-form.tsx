'use client'

import { useActionState } from 'react'
import { updateProfile } from '@/app/(authenticated)/settings/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRef, useState } from 'react'

interface SettingsFormProps {
  email: string
  fullName: string
  avatarUrl?: string
}

export function SettingsForm({ email, fullName, avatarUrl }: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, {
    error: null,
    success: false,
  })
  const [preview, setPreview] = useState<string | undefined>(avatarUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Avatar */}
      <div className="space-y-2">
        <Label>Profilbild</Label>
        <div className="flex items-center gap-4">
          <Avatar
            className="h-16 w-16 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {preview && <AvatarImage src={preview} />}
            <AvatarFallback className="text-lg">{initials || '?'}</AvatarFallback>
          </Avatar>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Bild ändern
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              name="avatar"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="fullName">Name</Label>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={fullName}
          placeholder="Dein Name"
        />
      </div>

      {/* Email (read-only) */}
      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input id="email" value={email} disabled className="opacity-50" />
        <p className="text-xs text-muted-foreground">
          E-Mail kann nicht geändert werden.
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-500">Profil aktualisiert!</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Wird gespeichert...' : 'Speichern'}
      </Button>
    </form>
  )
}
