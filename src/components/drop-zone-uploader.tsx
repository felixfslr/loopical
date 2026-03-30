'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createLoopicalFromFile } from '@/app/(authenticated)/projects/[id]/actions'
import { Upload, Check, AlertCircle, Loader2 } from 'lucide-react'

interface UploadItem {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  preview: string | null
}

interface DropZoneUploaderProps {
  projectId: string
}

export function DropZoneUploader({ projectId }: DropZoneUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const dragCounter = useRef(0)

  function titleFromFilename(name: string) {
    return name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
  }

  async function processFiles(files: FileList | File[]) {
    const accepted = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || f.type === 'application/pdf' ||
        f.type.startsWith('video/') || f.type === 'text/markdown' || f.type === 'text/plain' ||
        f.type.includes('officedocument')
    )
    if (accepted.length === 0) return

    const items: UploadItem[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending' as const,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : (file.type.startsWith('video/') ? URL.createObjectURL(file) : null),
    }))

    setUploads((prev) => [...prev, ...items])

    // Upload sequentially to avoid order_index conflicts
    for (const item of items) {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id ? { ...u, status: 'uploading' } : u
        )
      )

      const formData = new FormData()
      formData.append('file', item.file)
      formData.append('title', titleFromFilename(item.file.name))
      formData.append('projectId', projectId)

      const result = await createLoopicalFromFile(formData)

      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id
            ? { ...u, status: result.error ? 'error' : 'done' }
            : u
        )
      )
    }

    router.refresh()

    // Clear completed uploads after a delay
    setTimeout(() => {
      setUploads((prev) => prev.filter((u) => u.status === 'error'))
    }, 3000)
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current++
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    processFiles(e.dataTransfer.files)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      processFiles(e.target.files)
      e.target.value = ''
    }
  }

  const isUploading = uploads.some((u) => u.status === 'uploading' || u.status === 'pending')

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,video/mp4,video/webm,video/quicktime,text/markdown,text/plain,.docx,.pptx,.xlsx"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Drop zone */}
      <motion.div
        animate={isDragging ? { scale: 1.02 } : { scale: 1 }}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/20 hover:border-muted-foreground/40'
        }`}
        onClick={() => !isUploading && inputRef.current?.click()}
      >
        <Upload className="mx-auto h-6 w-6 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          {isDragging
            ? 'Dateien hier ablegen'
            : 'Dateien hierher ziehen oder klicken'}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Erstellt automatisch ein Loopical pro Datei
        </p>
      </motion.div>

      {/* Upload progress */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2"
          >
            {uploads.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 rounded-md border p-2"
              >
                {/* Thumbnail */}
                {item.preview ? (
                  <img
                    src={item.preview}
                    alt=""
                    className="h-10 w-10 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs text-muted-foreground">PDF</span>
                  </div>
                )}

                {/* Filename */}
                <span className="text-sm truncate flex-1">
                  {titleFromFilename(item.file.name)}
                </span>

                {/* Status */}
                {item.status === 'uploading' && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                )}
                {item.status === 'done' && (
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                )}
                {item.status === 'error' && (
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
