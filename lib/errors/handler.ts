/**
 * Error Handling Utilities
 *
 * Standardized error handling across API routes
 * Prevents sensitive information leakage in production
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN_ERROR')
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR')
    this.name = 'NotFoundError'
  }
}

/**
 * Format error for API response
 * Only includes stack trace in development
 */
export function formatError(error: unknown, isDev: boolean = false) {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return {
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      ...(error instanceof ValidationError && error.details
        ? { details: error.details }
        : {}),
      // Only include stack in development
      ...(isDev ? { stack: error.stack } : {}),
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      error: error.message,
      code: 'INTERNAL_ERROR',
      // Only include stack in development
      ...(isDev ? { stack: error.stack } : {}),
    }
  }

  // Unknown error type
  return {
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  }
}

/**
 * Create error response
 */
export function errorResponse(error: unknown): NextResponse {
  const isDev = process.env.NODE_ENV === 'development'
  const formatted = formatError(error, isDev)

  // Determine status code
  let statusCode = 500
  if (error instanceof AppError) {
    statusCode = error.statusCode
  } else if (error instanceof ZodError) {
    statusCode = 400
  }

  // Log error server-side (always log full details)
  console.error('API Error:', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    formatted,
  })

  return NextResponse.json(formatted, { status: statusCode })
}

/**
 * Async error handler wrapper
 * Use this to wrap route handlers
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return errorResponse(error)
    }
  }
}
