import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Mic,
  Sparkles,
  Users,
  Upload,
  MessageSquare,
  BarChart3,
  ArrowRight,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Loopical — Voice-first Feedback für deine Projekte',
  description:
    'Sammle Voice-Feedback auf Designs, Dokumente und Prototypen. KI-gestützte Transkription, Zusammenfassung und Action Items — auch für Gäste ohne Account.',
  openGraph: {
    title: 'Loopical — Voice-first Feedback',
    description:
      'Voice-Feedback aufnehmen, per KI transkribieren und analysieren. Für Design-Reviews, Nutzertests und Team-Feedback.',
    type: 'website',
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Loopical
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Anmelden
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Kostenlos starten
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Mic className="h-4 w-4 text-primary" />
            Voice-first Feedback Platform
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Feedback, das sich{' '}
            <span className="text-primary">anfühlt wie ein Gespräch</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Lade deine Designs, Dokumente oder Prototypen hoch und sammle
            Voice-Feedback — von deinem Team oder externen Stakeholdern. KI
            transkribiert, fasst zusammen und extrahiert Action Items automatisch.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Kostenlos ausprobieren
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 items-center gap-2 rounded-lg border border-border px-6 text-base font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Mehr erfahren
            </a>
          </div>
        </div>
      </section>

      {/* Screenshot / Mockup */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-muted/50 via-background to-muted/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,oklch(0.6_0.15_270/0.08),transparent_60%)]" />
          <div className="relative flex aspect-[16/9] items-center justify-center">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Mic className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-medium">Voice-Feedback in Aktion</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Feedback-Geber nehmen Audio direkt auf dem Bild auf — mit Pin-Markern
                und Freihand-Zeichnungen
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-border/50 bg-muted/20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Alles, was du für besseres Feedback brauchst
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Von der Aufnahme bis zur Analyse — in einer Plattform.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Mic}
              title="Voice Recording"
              description="Feedback per Sprache aufnehmen — direkt im Browser, ohne App-Installation. Schneller und natürlicher als Tippen."
            />
            <FeatureCard
              icon={Sparkles}
              title="KI-Analyse"
              description="Automatische Transkription, Zusammenfassung und Sentiment-Analyse. Action Items werden sofort extrahiert."
            />
            <FeatureCard
              icon={MessageSquare}
              title="Guided Feedback"
              description="Definiere spezifische Fragen und Marker auf deinen Bildern. Gäste werden Schritt für Schritt durch das Feedback geführt."
            />
            <FeatureCard
              icon={Users}
              title="Gast-Zugang"
              description="Feedback-Geber brauchen keinen Account. Teile einfach einen Link oder QR-Code — fertig."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              So einfach geht&apos;s
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              In drei Schritten von der Idee zum strukturierten Feedback.
            </p>
          </div>

          <div className="grid gap-12 lg:grid-cols-3">
            <StepCard
              step={1}
              icon={Upload}
              title="Hochladen"
              description="Lade dein Design, Screenshot oder Dokument hoch. Definiere optional Feedback-Punkte mit Markern auf dem Bild."
            />
            <StepCard
              step={2}
              icon={Mic}
              title="Feedback sammeln"
              description="Teile den Link mit deinem Team oder Stakeholdern. Sie nehmen Voice-Feedback direkt im Browser auf — kein Account nötig."
            />
            <StepCard
              step={3}
              icon={BarChart3}
              title="KI-Analyse"
              description="Die KI transkribiert die Aufnahmen, fasst sie zusammen und extrahiert Action Items mit Sentiment-Analyse."
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/50 bg-muted/20 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-12 sm:text-4xl">
            Häufige Fragen
          </h2>

          <div className="space-y-4">
            <FaqItem
              question="Brauchen Feedback-Geber einen Account?"
              answer="Nein. Du teilst einfach einen Link oder QR-Code. Gäste können sofort Voice-Feedback aufnehmen — ohne Registrierung."
            />
            <FaqItem
              question="Welche Dateitypen werden unterstützt?"
              answer="Bilder (PNG, JPG, WebP) und PDFs. Du kannst mehrere Dateien pro Loopical hochladen und auf jedem Bild Feedback-Punkte mit Markern setzen."
            />
            <FaqItem
              question="Wie funktioniert die KI-Analyse?"
              answer="Die Sprachaufnahmen werden automatisch transkribiert (ElevenLabs Scribe v2) und anschließend per KI analysiert. Du bekommst eine Zusammenfassung, Sentiment-Analyse und Action Items."
            />
            <FaqItem
              question="Ist mein Feedback sicher?"
              answer="Ja. Deine Daten werden in der EU gespeichert (Supabase, Region EU West). Audio und Bilder liegen in geschützten Storage-Buckets."
            />
            <FaqItem
              question="Was kostet Loopical?"
              answer="Loopical ist aktuell kostenlos nutzbar. Wir arbeiten an Bezahlplänen für Teams mit erweiterten Features."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Bereit für besseres Feedback?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Erstelle dein erstes Projekt in weniger als einer Minute.
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-8 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Jetzt kostenlos starten
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Loopical. Alle Rechte vorbehalten.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Anmelden
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-6 space-y-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function StepCard({
  step,
  icon: Icon,
  title,
  description,
}: {
  step: number
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 relative">
        <Icon className="h-6 w-6 text-primary" />
        <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {step}
        </span>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-lg border border-border/60 bg-background">
      <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-medium select-none [&::-webkit-details-marker]:hidden list-none">
        {question}
        <span className="ml-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="px-6 pb-4 text-sm text-muted-foreground leading-relaxed">
        {answer}
      </div>
    </details>
  )
}
