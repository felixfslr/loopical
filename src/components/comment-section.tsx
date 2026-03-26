'use client'

import { useActionState } from 'react'
import { addComment } from '@/app/(authenticated)/projects/[id]/loopicals/[loopicalId]/actions'
import { CommentItem } from '@/components/comment-item'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

interface Comment {
  id: string
  text: string
  created_at: string
  author: {
    full_name: string | null
    avatar_url: string | null
  } | null
}

interface CommentSectionProps {
  feedbackEntryId: string
  projectId: string
  loopicalId: string
  comments: Comment[]
}

export function CommentSection({
  feedbackEntryId,
  projectId,
  loopicalId,
  comments,
}: CommentSectionProps) {
  const [state, formAction, isPending] = useActionState(addComment, {
    error: null,
    success: false,
  })

  return (
    <div className="mt-3 pt-3 border-t space-y-3">
      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-2">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}

      {/* Add comment form */}
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="feedbackEntryId" value={feedbackEntryId} />
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="loopicalId" value={loopicalId} />
        <input
          name="text"
          placeholder="Kommentar schreiben..."
          className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button type="submit" size="icon-sm" disabled={isPending}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
      {state.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
    </div>
  )
}
