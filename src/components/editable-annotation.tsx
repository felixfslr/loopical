'use client'

import { useTransition } from 'react'
import { AnnotatedImage } from '@/components/annotated-image'
import { updateLoopicalAnnotation } from '@/app/(authenticated)/projects/[id]/actions'

interface EditableAnnotationProps {
  src: string
  alt: string
  loopicalId: string
  projectId: string
  annotationX: number | null
  annotationY: number | null
}

export function EditableAnnotation({
  src,
  alt,
  loopicalId,
  projectId,
  annotationX,
  annotationY,
}: EditableAnnotationProps) {
  const [isPending, startTransition] = useTransition()

  const markers =
    annotationX != null && annotationY != null
      ? [{ id: loopicalId, label: alt, x: annotationX, y: annotationY }]
      : []

  function handleImageClick(x: number, y: number) {
    startTransition(async () => {
      await updateLoopicalAnnotation(loopicalId, projectId, x, y)
    })
  }

  return (
    <div className={isPending ? 'opacity-70 pointer-events-none' : ''}>
      <AnnotatedImage
        src={src}
        alt={alt}
        markers={markers}
        activeMarkerId={loopicalId}
        editable
        onImageClick={handleImageClick}
        className="bg-muted"
      />
    </div>
  )
}
