'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { unarchiveProject } from '@/app/(authenticated)/projects/[id]/actions'
import { Button } from '@/components/ui/button'
import { Archive } from 'lucide-react'
import { toast } from 'sonner'

export function ArchivedBanner({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleUnarchive() {
    startTransition(async () => {
      const result = await unarchiveProject(projectId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Projekt wiederhergestellt')
        router.refresh()
      }
    })
  }

  return (
    <div className="mb-6 flex items-center justify-between rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
        <Archive className="h-4 w-4" />
        Dieses Projekt ist archiviert.
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnarchive}
        disabled={isPending}
      >
        {isPending ? 'Wird wiederhergestellt...' : 'Wiederherstellen'}
      </Button>
    </div>
  )
}
