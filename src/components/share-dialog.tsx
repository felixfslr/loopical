'use client'

import { useRef, useState } from 'react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QRCodeSVG } from 'qrcode.react'
import {
  Link as LinkIcon,
  Check,
  Copy,
  Download,
  Mail,
  ExternalLink,
  MessageSquare,
} from 'lucide-react'

interface ShareDialogProps {
  shareToken: string
  projectName: string
  loopicalCount: number
}

export function ShareDialog({
  shareToken,
  projectName,
  loopicalCount,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const qrRef = useRef<HTMLDivElement>(null)

  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/feedback/${shareToken}`
      : `${process.env.NEXT_PUBLIC_APP_URL}/feedback/${shareToken}`

  async function copyToClipboard() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadQR() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 400, 400)
      ctx.drawImage(img, 0, 0, 400, 400)
      const link = document.createElement('a')
      link.download = `loopical-qr-${shareToken.slice(0, 8)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  function sendEmail() {
    if (!email) return
    const subject = encodeURIComponent(`Feedback gesucht: ${projectName}`)
    const body = encodeURIComponent(
      `Hallo,\n\nich würde mich über dein Voice-Feedback freuen!\n\nKlicke auf den folgenden Link, um direkt loszulegen:\n${url}\n\nViele Grüße`
    )
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
    setEmail('')
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" />
        }
      >
        <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
        Teilen
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Projekt teilen</DialogTitle>
          <DialogDescription>
            Teile den Link mit deinem Team, um Voice-Feedback zu sammeln.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1: Copy Link */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Feedback-Link
            </label>
            <div className="flex gap-2">
              <Input
                value={url}
                readOnly
                className="text-xs"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Section 2: QR Code */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              QR-Code
            </label>
            <div className="flex items-center gap-4">
              <div
                ref={qrRef}
                className="rounded-lg border bg-white p-2"
              >
                <QRCodeSVG
                  value={url}
                  size={120}
                  level="M"
                  bgColor="white"
                  fgColor="black"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Scannen zum direkten Zugriff auf die Feedback-Seite.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadQR}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Herunterladen
                </Button>
              </div>
            </div>
          </div>

          {/* Section 3: Email Invite */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Per E-Mail einladen
            </label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendEmail()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={sendEmail}
                disabled={!email}
                className="shrink-0"
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                Senden
              </Button>
            </div>
          </div>

          {/* Section 4: Preview */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              So sieht es für Gäste aus
            </label>
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{projectName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {loopicalCount} Feedback-{loopicalCount === 1 ? 'Punkt' : 'Punkte'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Voice-Feedback
                </div>
              </div>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Vorschau öffnen
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
