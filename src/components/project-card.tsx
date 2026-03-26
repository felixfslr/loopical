import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string | null
    color: string
    loopicalCount: number
    createdAt: string
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="group cursor-pointer transition-colors hover:border-foreground/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <CardTitle className="text-base truncate">{project.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>
              {project.loopicalCount}{' '}
              {project.loopicalCount === 1 ? 'Loopical' : 'Loopicals'}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
