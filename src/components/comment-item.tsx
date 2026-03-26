import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface CommentItemProps {
  comment: {
    id: string
    text: string
    created_at: string
    author: {
      full_name: string | null
      avatar_url: string | null
    } | null
  }
}

export function CommentItem({ comment }: CommentItemProps) {
  const name = comment.author?.full_name || 'Anonym'
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const date = new Date(comment.created_at)

  return (
    <div className="flex gap-2">
      <Avatar className="h-6 w-6 shrink-0">
        {comment.author?.avatar_url && (
          <AvatarImage src={comment.author.avatar_url} />
        )}
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium">{name}</span>
          <span className="text-[10px] text-muted-foreground">
            {date.toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{comment.text}</p>
      </div>
    </div>
  )
}
