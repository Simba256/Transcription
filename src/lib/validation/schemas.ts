/**
 * Zod Validation Schemas for API Endpoints
 * Provides comprehensive input validation and sanitization
 */

import { z } from 'zod';

// =============================================================================
// COMMON VALIDATION SCHEMAS
// =============================================================================

/**
 * Common string validations
 */
const RequiredString = z.string().min(1, 'This field is required').trim();
const OptionalString = z.string().optional();
const EmailSchema = z.string().email('Invalid email address').toLowerCase();
const UrlSchema = z.string().url('Invalid URL format');

/**
 * Firebase ID schema (Firestore document IDs)
 */
const FirebaseIdSchema = z.string()
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid Firebase document ID')
  .min(1)
  .max(128);

/**
 * Transcription mode validation
 */
const TranscriptionModeSchema = z.enum(['ai', 'hybrid', 'human'], {
  errorMap: () => ({ message: 'Mode must be ai, hybrid, or human' }),
});

/**
 * Transcription status validation
 */
const TranscriptionStatusSchema = z.enum([
  'processing',
  'pending-review',
  'pending-transcription',
  'complete',
  'failed'
], {
  errorMap: () => ({ message: 'Invalid transcription status' }),
});

// =============================================================================
// TRANSCRIPTION API SCHEMAS
// =============================================================================

/**
 * Schema for creating transcription jobs
 * POST /api/transcriptions/create
 */
export const CreateTranscriptionJobSchema = z.object({
  filename: RequiredString.max(255, 'Filename too long'),
  originalFilename: RequiredString.max(255, 'Original filename too long'),
  filePath: RequiredString.max(500, 'File path too long'),
  downloadURL: UrlSchema.max(1000, 'Download URL too long'),
  status: TranscriptionStatusSchema,
  mode: TranscriptionModeSchema,
  duration: z.number()
    .min(0, 'Duration cannot be negative')
    .max(86400, 'Duration cannot exceed 24 hours'), // 24 hours in seconds
  creditsUsed: z.number()
    .int('Credits must be an integer')
    .min(0, 'Credits cannot be negative')
    .max(10000, 'Credits too high'),
  specialInstructions: z.string()
    .max(1000, 'Special instructions too long')
    .optional(),
  userId: z.string().optional(), // Will be overridden by authenticated user
});

/**
 * Schema for processing transcription jobs
 * POST /api/transcriptions/process
 */
export const ProcessTranscriptionJobSchema = z.object({
  jobId: FirebaseIdSchema,
  language: z.string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code')
    .default('en'),
  operatingPoint: z.enum(['standard', 'enhanced'], {
    errorMap: () => ({ message: 'Operating point must be standard or enhanced' }),
  }).default('enhanced'),
});

// =============================================================================
// AUTH API SCHEMAS
// =============================================================================

/**
 * Schema for user authentication
 * POST /api/auth/signin
 */
export const SignInSchema = z.object({
  email: EmailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * Schema for user registration
 * POST /api/auth/signup
 */
export const SignUpSchema = z.object({
  email: EmailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: RequiredString.max(100, 'Name too long'),
  confirmPassword: RequiredString,
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * Schema for password reset
 * POST /api/auth/forgot-password
 */
export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});

// =============================================================================
// BILLING API SCHEMAS
// =============================================================================

/**
 * Schema for creating payment intents
 * POST /api/billing/create-payment-intent
 */
export const CreatePaymentIntentSchema = z.object({
  packageId: z.enum(['starter', 'professional', 'enterprise'], {
    errorMap: () => ({ message: 'Invalid package ID' }),
  }),
  credits: z.number()
    .int('Credits must be an integer')
    .min(100, 'Minimum 100 credits')
    .max(50000, 'Maximum 50,000 credits'),
  amount: z.number()
    .min(5, 'Minimum amount $5.00')
    .max(5000, 'Maximum amount $5,000.00'),
  currency: z.string()
    .length(3, 'Currency must be 3 characters')
    .default('usd'),
});

/**
 * Schema for confirming payments
 * POST /api/billing/confirm-payment
 */
export const ConfirmPaymentSchema = z.object({
  paymentIntentId: RequiredString.max(255),
  packageId: z.enum(['starter', 'professional', 'enterprise']),
});

// =============================================================================
// ADMIN API SCHEMAS
// =============================================================================

/**
 * Schema for admin job processing
 * POST /api/admin/process-job
 */
export const AdminProcessJobSchema = z.object({
  jobId: FirebaseIdSchema,
  language: z.string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code')
    .default('en'),
  operatingPoint: z.enum(['standard', 'enhanced']).default('enhanced'),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
});


// =============================================================================
// GENERAL API SCHEMAS
// =============================================================================

/**
 * Schema for file uploads (metadata validation)
 */
export const FileUploadSchema = z.object({
  filename: RequiredString.max(255),
  size: z.number()
    .int('Size must be an integer')
    .min(1, 'File cannot be empty')
    .max(104857600, 'File cannot exceed 100MB'), // 100MB
  type: z.string()
    .regex(/^(audio|video)\//, 'File must be audio or video')
    .max(100),
});

/**
 * Schema for pagination parameters
 */
export const PaginationSchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform(val => Math.max(1, parseInt(val)))
    .default('1'),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(val => Math.min(100, Math.max(1, parseInt(val))))
    .default('10'),
});

// =============================================================================
// VALIDATION HELPER FUNCTIONS
// =============================================================================

/**
 * Validates data against schema and returns parsed data
 */
export function validateData<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    // Extract error messages from Zod error
    const errors: string[] = [];
    if (result.error && result.error.errors) {
      for (const err of result.error.errors) {
        const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
        errors.push(`${path}${err.message}`);
      }
    }

    if (errors.length === 0) {
      errors.push('Validation failed');
    }

    return { success: false, errors };
  }
}

/**
 * Validates request body against schema and returns parsed data
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
  try {
    const body = await request.json();
    return validateData(body, schema);
  } catch (error) {
    return {
      success: false,
      errors: ['Invalid JSON in request body']
    };
  }
}

/**
 * Validates query parameters against schema
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const result = schema.safeParse(params);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
  } catch (error) {
    return {
      success: false,
      errors: ['Invalid query parameters']
    };
  }
}

/**
 * Sanitizes HTML content to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates and sanitizes user input
 */
export function sanitizeUserInput(input: string): string {
  return sanitizeHtml(input.trim());
}