/**
 * Loads environment variables from .env and validates them ONCE at startup.
 *
 * Why: if a required variable is missing we want the server to crash immediately
 * with a clear message, not fail later with a confusing error deep inside a request.
 * Everything else in the app imports `env` from here instead of reading process.env.
 */
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

// Treat empty strings ("MONGO_URI=") the same as "not set".
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),

    // Database
    MONGO_URI: optionalString,

    // Comma-separated list of frontend origins allowed by CORS
    CLIENT_URL: z.string().default('http://localhost:5173'),

    // AI (Google Gemini)
    GEMINI_API_KEY: optionalString,
    GEMINI_MODEL: z.string().default('gemini-3.5-flash-lite'),

    // Development only: return realistic sample content instead of calling Gemini
    AI_MOCK: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),

    // Authentication (Auth0). The domain is accepted with or without "https://".
    AUTH0_DOMAIN: optionalString.transform((domain) =>
      domain?.replace(/^https?:\/\//, '').replace(/\/+$/, ''),
    ),
    AUTH0_AUDIENCE: optionalString, // the API Identifier, e.g. https://edify-api
  })
  .refine((data) => data.NODE_ENV !== 'production' || data.MONGO_URI, {
    message: 'MONGO_URI is required in production',
    path: ['MONGO_URI'],
  })
  .refine((data) => data.NODE_ENV !== 'production' || (data.AUTH0_DOMAIN && data.AUTH0_AUDIENCE), {
    message: 'AUTH0_DOMAIN and AUTH0_AUDIENCE are required in production',
    path: ['AUTH0_DOMAIN'],
  })
  .refine((data) => data.NODE_ENV !== 'production' || !data.AI_MOCK, {
    message: 'AI_MOCK cannot be enabled in production',
    path: ['AI_MOCK'],
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  clientOrigins: parsed.data.CLIENT_URL.split(',').map((origin) => origin.trim()),
};
