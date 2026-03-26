import { Skeleton } from '@/components/ui/skeleton'

export default function GuestFeedbackLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-16">
        <div className="text-center mb-10">
          <Skeleton className="h-4 w-20 mx-auto mb-2" />
          <Skeleton className="h-9 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto mt-2" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
