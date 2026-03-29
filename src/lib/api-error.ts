import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode },
    )
  }
  logger.error({ err: error }, 'Unhandled API error')
  return NextResponse.json(
    { error: 'Interner Serverfehler.' },
    { status: 500 },
  )
}
