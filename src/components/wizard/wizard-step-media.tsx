'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X, GripVertical, ArrowRight, Link2, Plus, FileText, Film, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50 MB
const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/pdf',
  'video/mp4', 'video/webm', 'video/quicktime',
  'text/markdown', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

function isAcceptedType(file: File) {
  return ALLOWED_TYPES.includes(file.type) ||
    file.type.startsWith('image/') ||
    file.type.startsWith('video/')
}

function getMaxSize(file: File) {
  return file.type.startsWith('video/') ? MAX_VIDEO_SIZE : MAX_FILE_SIZE
}

function getMediaLabel(file: File): string {
  if (file.type.startsWith('image/')) return 'Bild'
  if (file.type === 'application/pdf') return 'PDF'
  if (file.type.startsWith('video/')) return 'Video'
  if (file.type === 'text/markdown' || file.type === 'text/plain') return 'Text'
  if (file.type.includes('wordprocessingml')) return 'DOCX'
  if (file.type.includes('presentationml')) return 'PPTX'
  if (file.type.includes('spreadsheetml')) return 'XLSX'
  return 'Datei'
}

export interface MediaItem {
  id: string
  file: File | null
  preview: string | null
  label: string
  url?: string // For URL-type media (no file upload)
}

interface WizardStepMediaProps {
  title: string
  onTitleChange: (title: string) => void
  media: MediaItem[]
  onMediaChange: (media: MediaItem[]) => void
  contextUrl: string
  onContextUrlChange: (url: string) => void
  onNext: () => void
}

export function WizardStepMedia({
  title,
  onTitleChange,
  media,
  onMediaChange,
  contextUrl,
  onContextUrlChange,
  onNext,
}: WizardStepMediaProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const [urlInput, setUrlInput] = useState('')

  function handleFiles(files: FileList | File[]) {
    const all = Array.from(files)
    const rejected = all.filter((f) => !isAcceptedType(f))
    const tooLarge = all.filter((f) => isAcceptedType(f) && f.size > getMaxSize(f))
    if (rejected.length > 0) {
      toast.error('Nicht unterstützter Dateityp.')
    }
    if (tooLarge.length > 0) {
      toast.error('Datei ist zu groß (max. 10 MB, Videos 50 MB).')
    }
    const accepted = all.filter((f) => isAcceptedType(f) && f.size <= getMaxSize(f))
    if (accepted.length === 0) return

    const items: MediaItem[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      label: getMediaLabel(file),
    }))

    onMediaChange([...media, ...items])
  }

  function handleAddUrl() {
    const url = urlInput.trim()
    if (!url) return
    try {
      new URL(url) // validate
    } catch {
      toast.error('Ungültige URL.')
      return
    }
    const item: MediaItem = {
      id: crypto.randomUUID(),
      file: null,
      preview: null,
      label: 'URL',
      url,
    }
    onMediaChange([...media, item])
    setUrlInput('')
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
          Gib einen Titel ein und lade Dateien hoch oder bette eine Website ein.
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

      {/* Upload zone — two options side by side */}
      <div className="space-y-3">
        <Label>Dateien / Medien (optional)</Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* File upload */}
          <div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,video/mp4,video/webm,video/quicktime,text/markdown,text/plain,.docx,.pptx,.xlsx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handleFiles(e.target.files)
                  e.target.value = ''
                }
              }}
            />
            <div
              className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer hover:border-muted-foreground/40 transition-colors h-full flex flex-col items-center justify-center"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                handleFiles(e.dataTransfer.files)
              }}
            >
              <Upload className="h-6 w-6 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Dateien hochladen
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Bilder, PDFs, Videos, Docs
              </p>
            </div>
          </div>

          {/* URL input */}
          <div
            className="rounded-lg border-2 border-dashed p-6 text-center flex flex-col items-center justify-center gap-3"
          >
            <Link2 className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Website einbetten</p>
            <div className="flex gap-1.5 w-full">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                className="h-8 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                onClick={handleAddUrl}
                disabled={!urlInput.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
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
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    {item.label === 'Video' && <Film className="h-5 w-5 text-muted-foreground/60" />}
                    {item.label === 'URL' && <Link2 className="h-5 w-5 text-muted-foreground/60" />}
                    {(item.label === 'DOCX' || item.label === 'PPTX' || item.label === 'XLSX') && <FileSpreadsheet className="h-5 w-5 text-muted-foreground/60" />}
                    {(item.label === 'Text' || item.label === 'PDF') && <FileText className="h-5 w-5 text-muted-foreground/60" />}
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    {item.url && (
                      <span className="text-[10px] text-muted-foreground/60 truncate max-w-full px-1">{item.url}</span>
                    )}
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

      {/* Context URL */}
      <div className="space-y-2">
        <Label htmlFor="wizard-context-url" className="flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5" />
          Live-URL (optional)
        </Label>
        <Input
          id="wizard-context-url"
          type="url"
          value={contextUrl}
          onChange={(e) => onContextUrlChange(e.target.value)}
          placeholder="z.B. https://app.example.com/dashboard"
        />
        <p className="text-xs text-muted-foreground">
          Feedback-Geber können diese Seite in einem neuen Tab öffnen, um das Tool live zu nutzen.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!isValid}>
          Weiter
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
