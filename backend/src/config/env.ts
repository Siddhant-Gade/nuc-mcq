import 'dotenv/config';
import { z } from 'zod';

const environmentSchema = z.object({
  DATABASE_URL: z
    .url('DATABASE_URL must be a valid PostgreSQL connection URL.')
    .refine(
      (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      'DATABASE_URL must use the PostgreSQL protocol.',
    ),
  SUPABASE_JWT_ISSUER: z.url('SUPABASE_JWT_ISSUER must be a valid URL.'),
  SUPABASE_JWT_AUDIENCE: z.string().trim().min(1).default('authenticated'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
    .refine((origins) => origins.every((origin) => z.url().safeParse(origin).success), {
      message: 'CORS_ORIGINS must be a comma-separated list of valid origins.',
    }),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const details = parsedEnvironment.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsedEnvironment.data;
