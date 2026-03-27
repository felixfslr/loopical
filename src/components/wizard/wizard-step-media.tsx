'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X, GripVertical, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']

export interface MediaItem {
  id: string
  file: File
  preview: string | null
}

interface WizardStepMediaProps {
  title: string
  onTitleChange: (title: string) => void
  media: MediaItem[]
  onMediaChange: (media: MediaItem[]) => void
  onNext: () => void
}

export function WizardStepMedia({
  title,
  onTitleChange,
  media,
  onMediaChange,
  onNext,
}: WizardStepMediaProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  function handleFiles(files: FileList | File[]) {
    const all = Array.from(files)
    const rejected = all.filter(
      (f) => !ALLOWED_TYPES.includes(f.type) && !f.type.startsWith('image/'),
    )
    const tooLarge = all.filter((f) => f.size > MAX_FILE_SIZE)
    if (rejected.length > 0) {
      toast.error('Nur Bilder und PDFs sind erlaubt.')
    }
    if (tooLarge.length > 0) {
      toast.error(`Dateien dürfen maximal 10 MB groß sein.`)
    }
    const accepted = all.filter(
      (f) =>
        (f.type.startsWith('image/') || f.type === 'application/pdf') &&
        f.size <= MAX_FILE_SIZE,
    )
    if (accepted.length === 0) return

    const items: MediaItem[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }))

    onMediaChange([...media, ...items])
  }

  function removeMedia(id: string) {
    const item = media.find((m) => m.id === id)
    if (item?.preview) URL.revokeObjectURL(item.preview)
    onMediaChange(media.filter((m) => m.id !== id))
  }

  function handleDragStart(index: number) {
    dragItem.current = index
  }

  function handleDragEnter(index: number) {
    dragOverItem.current = index
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return
    const items = [...media]
    const dragged = items.splice(dragItem.current, 1)[0]
    items.splice(dragOverItem.current, 0, dragged)
    onMediaChange(items)
    dragItem.current = null
    dragOverItem.current = null
  }

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.files ?? [])
      if (files.length > 0) {
        e.preventDefault()
        handleFiles(files)
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  })

  const isValid = title.trim().length > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Was möchtest du reviewen lassen?</h2>
        <p className="text-sm text-muted-foreground">
          Gib einen Titel ein und lade Screenshots oder Bilder hoch.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wizard-title">Titel</Label>
        <Input
          id="wizard-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="z.B. Header-Design Feedback"
          autoFocus
        />
      </div>

      {/* Upload zone */}
      <div className="space-y-2">
        <Label>Bilder / Screenshots (optional)</Label>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files)
              e.target.value = ''
            }
          }}
        />
        <div
          className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer hover:border-muted-foreground/40 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            handleFiles(e.dataTransfer.files)
          }}
        >
          <Upload className="mx-auto h-6 w-6 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            Bilder hierher ziehen, klicken oder einfügen (Strg+V)
          </p>
        </div>
      </div>

      {/* Media thumbnails */}
      <AnimatePresence>
        {media.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {media.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="relative group rounded-lg border overflow-hidden bg-muted aspect-video"
              >
                {item.preview ? (
                  <img
                    src={item.preview}
                    alt=""
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">PDF</span>
                  </div>
                )}
                {/* Drag handle */}
                <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-background/80 rounded p-0.5 cursor-grab">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
                {/* Remove */}
                <button
                  onClick={() => removeMedia(item.id)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded-full p-0.5"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {/* Index badge */}
                <div className="absolute bottom-1 left-1 bg-background/80 text-xs font-medium px-1.5 py-0.5 rounded">
                  {index + 1}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!isValid}>
          Weiter
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
