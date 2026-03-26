'use client'

import { useActionState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Upload } from 'lucide-react'
import { useState } from 'react'

interface CreateLoopicalDialogProps {
  projectId: string
  action: (
    prevState: { error: string | null; success: boolean },
    formData: FormData,
  ) => Promise<{ error: string | null; success: boolean }>
}

export function CreateLoopicalDialog({
  projectId,
  action,
}: CreateLoopicalDialogProps) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [state, formAction, isPending] = useActionState(
    async (
      prevState: { error: string | null; success: boolean },
      formData: FormData,
    ) => {
      const result = await action(prevState, formData)
      if (result.success) {
        setOpen(false)
        setPreview(null)
      }
      return result
    },
    { error: null, success: false },
  )

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neues Loopical
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Loopical erstellen</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="projectId" value={projectId} />

          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="z.B. Header-Design Feedback"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Beschreibung / Feedback-Frage (optional)
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Was sollen die Feedback-Geber beachten?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Bild / Screenshot (optional)</Label>
            <div
              className="relative flex flex-col items-center justify-center rounded-lg border border-dashed p-6 cursor-pointer hover:border-foreground/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-40 rounded object-contain"
                />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Klicke zum Hochladen
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                name="media"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Wird erstellt...' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
