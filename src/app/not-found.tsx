import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground/30 mb-4">
          404
        </h1>
        <h2 className="text-xl font-semibold mb-2">Seite nicht gefunden</h2>
        <p className="text-sm text-muted-foreground mb-8">
          Die gesuchte Seite existiert nicht oder wurde verschoben.
        </p>
        <Link href="/dashboard">
          <Button>Zum Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
