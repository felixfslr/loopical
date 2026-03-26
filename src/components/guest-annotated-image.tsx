'use client'

import { useRouter } from 'next/navigation'
import { AnnotatedImage } from '@/components/annotated-image'

interface Marker {
  id: string
  label: string
  x: number
  y: number
}

interface GuestAnnotatedImageProps {
  src: string
  alt: string
  markers: Marker[]
  activeMarkerId: string
  shareToken: string
}

export function GuestAnnotatedImage({
  src,
  alt,
  markers,
  activeMarkerId,
  shareToken,
}: GuestAnnotatedImageProps) {
  const router = useRouter()

  return (
    <AnnotatedImage
      src={src}
      alt={alt}
      markers={markers}
      activeMarkerId={activeMarkerId}
      onMarkerClick={(markerId) => {
        router.push(`/feedback/${shareToken}/${markerId}`)
      }}
      className="max-w-full max-h-full"
    />
  )
}
