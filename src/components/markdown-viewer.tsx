'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownViewerProps {
  content: string
  className?: string
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  return (
    <div className={`rounded-lg border bg-background overflow-auto max-h-[70vh] ${className ?? ''}`}>
      <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className: codeClassName, children, ...props }) {
              const isBlock = codeClassName?.startsWith('language-')
              if (isBlock) {
                return (
                  <HighlightedCode
                    code={String(children).replace(/\n$/, '')}
                    language={codeClassName?.replace('language-', '') ?? 'text'}
                  />
                )
              }
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-[0.85em]" {...props}>
                  {children}
                </code>
              )
            },
          }}
        />
      </div>
    </div>
  )
}

function HighlightedCode({ code, language }: { code: string; language: string }) {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    import('shiki').then(async ({ createHighlighter }) => {
      try {
        const highlighter = await createHighlighter({
          themes: ['github-dark', 'github-light'],
          langs: [language],
        })
        if (cancelled) return
        const result = highlighter.codeToHtml(code, {
          lang: language,
          themes: { light: 'github-light', dark: 'github-dark' },
        })
        setHtml(result)
      } catch {
        // Language not supported — fall back to plain
      }
    })
    return () => { cancelled = true }
  }, [code, language])

  if (html) {
    return <div dangerouslySetInnerHTML={{ __html: html }} className="rounded-md overflow-auto text-sm [&_pre]:p-4 [&_pre]:m-0" />
  }

  return (
    <pre className="bg-muted rounded-md p-4 overflow-auto text-sm">
      <code>{code}</code>
    </pre>
  )
}
