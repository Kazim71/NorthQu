import { NextResponse } from 'next/server';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BOOLEAN_FIELDS = [
  'ingestion_paused',
  'has_leadpulse',
  'has_automation',
  'has_web_services',
  'has_crm',
] as const;
type BooleanField = (typeof BOOLEAN_FIELDS)[number];

/**
 * PATCH /api/admin/organizations/:organizationId
 * Platform-admin-only toggles that don't belong on the org-admin's own
 * dashboard: pausing a tenant's event ingestion (migration 0010,
 * enforced in backend/src/middleware/resolveOrg.ts), and which services
 * a tenant has enabled (drives the /app service hub).
 */
export async function PATCH(
  request: Request,
  { params }: { params: { organizationId: string } },
) {
  const admin = await getPlatformAdminOrNull();
  if (!admin) {
    return NextResponse.json(
      { error: 'Forbidden — platform admin access required' },
      { status: 403 },
    );
  }

  if (!UUID_RE.test(params.organizationId)) {
    return NextResponse.json({ error: 'Invalid organization id' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 });
  }

  const patch: Partial<Record<BooleanField, boolean>> = {};
  for (const field of BOOLEAN_FIELDS) {
    if (field in body) {
      if (typeof body[field] !== 'boolean') {
        return NextResponse.json({ error: `${field} must be a boolean` }, { status: 400 });
      }
      patch[field] = body[field] as boolean;
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('organizations')
    .update(patch)
    .eq('id', params.organizationId)
    .select(
      'id, name, slug, industry, ingestion_paused, has_leadpulse, has_automation, has_web_services, has_crm',
    )
    .maybeSingle();

  if (error) {
    console.error('[admin] update organization failed', error);
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  return NextResponse.json({ organization: data });
}
