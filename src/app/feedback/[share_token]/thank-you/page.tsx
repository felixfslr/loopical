import { Check } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function ThankYouPage({
  params,
}: {
  params: Promise<{ share_token: string }>
}) {
  const { share_token } = await params

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <Check className="h-8 w-8 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Danke für dein Feedback!
        </h1>
        <p className="text-muted-foreground mb-8">
          Dein Voice-Feedback wird gerade verarbeitet und ist in Kürze
          verfügbar.
        </p>
        <Link href={`/feedback/${share_token}`}>
          <Button variant="outline">
            Weiteres Feedback geben
          </Button>
        </Link>
        <div className="mt-12">
          <p className="text-xs text-muted-foreground">
            Powered by{' '}
            <span className="font-medium text-foreground">Loopical</span>
          </p>
        </div>
      </div>
    </div>
  )
}
