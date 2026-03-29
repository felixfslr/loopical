'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { archiveProject, deleteProject } from '@/app/(authenticated)/projects/[id]/actions'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreVertical, Archive, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface ProjectActionsMenuProps {
  projectId: string
}

export function ProjectActionsMenu({ projectId }: ProjectActionsMenuProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveProject(projectId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Projekt archiviert')
        router.push('/dashboard')
      }
    })
  }

  function handleDelete() {
    if (!confirm('Projekt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return
    }

    startTransition(async () => {
      const result = await deleteProject(projectId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Projekt gelöscht')
        router.push('/dashboard')
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" disabled={isPending}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handleArchive}>
          <Archive className="mr-2 h-4 w-4" />
          Archivieren
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Projekt löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
