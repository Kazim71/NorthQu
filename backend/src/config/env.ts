import 'dotenv/config';
import { z } from 'zod';

// Fail at boot, not at first request. A misconfigured deploy should never
// reach the point of accepting traffic and returning 500s per event.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20, 'SUPABASE_SERVICE_ROLE_KEY looks too short to be a real key'),

  ORG_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),

  CORS_ORIGINS: z.string().default('*'),

  // Shared secret Shopify signs every webhook with (Notifications settings,
  // or the app's API secret for app-registered webhooks). OPTIONAL on
  // purpose: the webhook endpoint isn't wired to a live store yet, and
  // hard-requiring it would break the boot of every existing deploy that
  // doesn't process webhooks. The /api/webhooks/shopify/checkout handler
  // fails closed with a 503 if a webhook arrives while this is unset — so a
  // missing secret can never be mistaken for a valid signature. Make it
  // required here once a store is actually connected.
  SHOPIFY_WEBHOOK_SECRET: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  // Bypasses the logger deliberately: the logger has no dependency on env,
  // but this must be readable even if everything else failed to load.
  process.stderr.write(`Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;

export const isProduction = env.NODE_ENV === 'production';
