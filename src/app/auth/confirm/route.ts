import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as 'magiclink' | 'email' | null

  if (tokenHash && type) {
    const response = NextResponse.redirect(new URL('/dashboard', url.origin))

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const cookieHeader = request.headers.get('cookie') ?? ''
            return cookieHeader
              .split(';')
              .filter(Boolean)
              .map((cookie) => {
                const [name, ...rest] = cookie.trim().split('=')
                return { name, value: rest.join('=') }
              })
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      },
    )

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type === 'email' ? 'email' : 'magiclink',
    })

    if (!error) {
      return response
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth', url.origin))
}
