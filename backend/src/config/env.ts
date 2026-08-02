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

  // ---- ingestion enrichment (geo + device) ----
  // Kill switch for the IP -> location lookup. Enabled by default because
  // enrichment is the point of the feature; set 'false' to stop all outbound
  // provider calls (events then store null location -> UI shows "Unknown").
  // An explicit enum rather than z.coerce.boolean(), which would read the
  // string 'false' as TRUE (any non-empty string is truthy).
  GEOIP_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  // Aborts the provider HTTP request itself, so a hung connection can never
  // leak a socket. Generous, because it is NOT what bounds ingestion latency.
  GEOIP_TIMEOUT_MS: z.coerce.number().int().positive().default(4000),
  // How long an ingestion will actually WAIT for a location before writing
  // the event without one. Shorter than the request timeout on purpose: when
  // it expires the lookup keeps running in the background and still warms the
  // cache, so the visitor's next event is enriched. A slow provider therefore
  // costs one unenriched event, never a slow endpoint. (Measured ~0.7-1.2s
  // to ipwho.is from a dev machine, so 1500 normally resolves inline.)
  GEOIP_MAX_WAIT_MS: z.coerce.number().int().positive().default(1500),
  // An IP's city does not change hour to hour, so cache aggressively.
  GEOIP_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
  // Shorter TTL for failed/unresolvable lookups so a transient provider
  // outage doesn't blank out a whole day of enrichment.
  GEOIP_NEGATIVE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(600),

  // Shared secret Shopify signs every webhook with (Notifications settings,
  // or the app's API secret for app-registered webhooks). OPTIONAL on
  // purpose: the webhook endpoint isn't wired to a live store yet, and
  // hard-requiring it would break the boot of every existing deploy that
  // doesn't process webhooks. The /api/webhooks/shopify/checkout handler
  // fails closed with a 503 if a webhook arrives while this is unset — so a
  // missing secret can never be mistaken for a valid signature. Make it
  // required here once a store is actually connected.
  SHOPIFY_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Automation service (n8n), see lib/automation.ts. Both optional — the
  // forwarder is a no-op with either unset, so an existing deploy that
  // doesn't use Automation needs zero changes.
  N8N_WEBHOOK_URL: z.string().url().optional(),
  N8N_TRIGGER_EVENT_TYPES: z.string().optional(),
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
