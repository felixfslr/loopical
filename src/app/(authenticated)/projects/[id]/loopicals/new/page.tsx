import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { LoopicalWizard } from '@/components/wizard/loopical-wizard'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewLoopicalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireUser()
  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!project) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu {project.name}
      </Link>

      <LoopicalWizard projectId={id} />
    </div>
  )
}
