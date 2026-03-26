'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, Link as LinkIcon } from 'lucide-react'

interface ShareLinkProps {
  shareToken: string
}

export function ShareLink({ shareToken }: ShareLinkProps) {
  const [copied, setCopied] = useState(false)
  const url = `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL}/feedback/${shareToken}`

  async function copyToClipboard() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" onClick={copyToClipboard}>
      {copied ? (
        <>
          <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />
          Kopiert!
        </>
      ) : (
        <>
          <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
          Share-Link
        </>
      )}
    </Button>
  )
}
