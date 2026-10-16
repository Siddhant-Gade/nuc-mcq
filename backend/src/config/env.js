import 'dotenv/config';
import { z } from 'zod';
const environmentSchema = z.object({
    DATABASE_URL: z
        .url('DATABASE_URL must be a valid PostgreSQL connection URL.')
        .refine((url) => url.startsWith('postgresql://') || url.startsWith('postgres://'), 'DATABASE_URL must use the PostgreSQL protocol.'),
    SUPABASE_JWT_ISSUER: z.url('SUPABASE_JWT_ISSUER must be a valid URL.'),
    SUPABASE_JWT_AUDIENCE: z.string().trim().min(1).default('authenticated'),
    CORS_ORIGINS: z
        .string()
        .default('http://localhost:5173,http://localhost:5174')
        .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
        .refine((origins) => origins.every((origin) => z.url().safeParse(origin).success), {
        message: 'CORS_ORIGINS must be a comma-separated list of valid origins.',
    }),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /**
     * Phase 13 study materials storage. Optional at boot so non-storage tests
     * run without them; the storage utility throws a clear error at call time
     * when they are unset. The service-role key is backend-only and must never
     * reach any client bundle.
     */
    SUPABASE_URL: z.url('SUPABASE_URL must be a valid URL.').optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1).optional(),
    FIREBASE_SERVICE_ACCOUNT_PATH: z.string().trim().optional(),
    FIREBASE_SERVICE_ACCOUNT_KEY: z.string().trim().optional(),
    /** The Supabase email that is always granted ADMIN + SUPER_ADMIN roles.
     *  Defaults to the bootstrapped admin account; override in production env. */
    SUPER_ADMIN_EMAIL: z.string().trim().email().default('newuniquesupabase@gmail.com'),
});
const parsedEnvironment = environmentSchema.safeParse(process.env);
if (!parsedEnvironment.success) {
    const details = parsedEnvironment.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
}
export const env = parsedEnvironment.data;
