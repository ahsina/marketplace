import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiResponse } from '@/types'

/**
 * Validation error response format
 */
interface ValidationErrorResponse extends ApiResponse {
  success: false
  error: string
  errors?: Array<{
    field: string
    message: string
  }>
}

/**
 * Format Zod errors into a readable format
 */
function formatZodErrors(error: z.ZodError<any>): ValidationErrorResponse['errors'] {
  return error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message
  }))
}

/**
 * Validate request body against a Zod schema
 *
 * @param request - Next.js request object
 * @param schema - Zod validation schema
 * @returns Parsed and validated data, or null if validation fails
 *
 * @example
 * const data = await validateRequest(request, loginSchema)
 * if (!data) return // Response already sent
 */
export async function validateRequest<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): Promise<z.infer<T> | null> {
  try {
    const body = await request.json()
    const validatedData = schema.parse(body)
    return validatedData
  } catch (error) {
    return null
  }
}

/**
 * Validate request body and return error response if validation fails
 *
 * This function returns [data, null] on success, or [null, response] on failure.
 *
 * @example
 * const [data, error] = await validate(request, loginSchema)
 * if (error) return error
 * // Use validated data...
 */
export async function validate<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): Promise<[z.infer<T>, null] | [null, NextResponse]> {
  try {
    const body = await request.json()
    const validatedData = schema.parse(body)
    return [validatedData, null]
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = formatZodErrors(error)
      const response = NextResponse.json<ValidationErrorResponse>(
        {
          success: false,
          error: 'Validation failed',
          errors
        },
        { status: 400 }
      )
      return [null, response]
    }

    if (error instanceof SyntaxError) {
      const response = NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid JSON in request body'
        },
        { status: 400 }
      )
      return [null, response]
    }

    // Unexpected error
    console.error('Validation error:', error)
    const response = NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Invalid request data'
      },
      { status: 400 }
    )
    return [null, response]
  }
}

/**
 * Validate query parameters against a Zod schema
 *
 * @example
 * const [params, error] = validateQuery(request, productSearchSchema)
 * if (error) return error
 */
export function validateQuery<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): [z.infer<T>, null] | [null, NextResponse] {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedData = schema.parse(params)
    return [validatedData, null]
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = formatZodErrors(error)
      const response = NextResponse.json<ValidationErrorResponse>(
        {
          success: false,
          error: 'Invalid query parameters',
          errors
        },
        { status: 400 }
      )
      return [null, response]
    }

    // Unexpected error
    console.error('Query validation error:', error)
    const response = NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Invalid query parameters'
      },
      { status: 400 }
    )
    return [null, response]
  }
}

/**
 * Sanitize HTML/script content from strings to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as any
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key])
    }
  }

  return sanitized
}
