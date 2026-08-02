import { NextResponse } from 'next/server';
import { getOrgAdminOrNull } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/** PATCH /api/org/settings — edit the caller's own org name/industry.
 * Scoped to viewer.organizationId, never a body-supplied id. */
export async function PATCH(request: Request) {
  const viewer = await getOrgAdminOrNull();
  if (!viewer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { name?: unknown; industry?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 });
  }

  const patch: { name?: string; industry?: string | null } = {};
  if ('name' in body) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'Organization name cannot be empty' }, { status: 400 });
    patch.name = name;
  }
  if ('industry' in body) {
    patch.industry = typeof body.industry === 'string' ? body.industry.trim() || null : null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('organizations')
    .update(patch)
    .eq('id', viewer.organizationId)
    .select('id, name, slug, industry')
    .maybeSingle();

  if (error) {
    console.error('[org] update settings failed', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ organization: data });
}
