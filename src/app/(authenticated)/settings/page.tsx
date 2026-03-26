import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/settings-form'

export default async function SettingsPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Einstellungen</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Verwalte dein Profil
      </p>

      <SettingsForm
        email={user.email ?? ''}
        fullName={profile?.full_name ?? ''}
        avatarUrl={profile?.avatar_url ?? undefined}
      />
    </div>
  )
}
