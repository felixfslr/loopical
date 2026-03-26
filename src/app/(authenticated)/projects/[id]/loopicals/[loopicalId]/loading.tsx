import { Skeleton } from '@/components/ui/skeleton'

export default function LoopicalLoading() {
  return (
    <div>
      <Skeleton className="h-4 w-32 mb-6" />
      <Skeleton className="aspect-video max-h-80 w-full rounded-lg mb-6" />
      <div className="flex items-start justify-between mb-8">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
