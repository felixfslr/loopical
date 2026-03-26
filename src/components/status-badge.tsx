import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig = {
  open: { label: 'Offen', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  in_progress: { label: 'In Arbeit', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  done: { label: 'Erledigt', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
} as const

interface StatusBadgeProps {
  status: 'open' | 'in_progress' | 'done'
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}
