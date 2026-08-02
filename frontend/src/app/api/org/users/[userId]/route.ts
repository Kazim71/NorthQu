import { NextResponse } from 'next/server';
import { getOrgAdminOrNull } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PATCH/DELETE /api/org/users/:userId — self-service teammate management,
 * scoped to the caller's own org. Every write below carries an explicit
 * `.eq('organization_id', viewer.organizationId)` — belt-and-suspenders
 * alongside RLS (admin_users_update/delete_own_org already enforce this at
 * the database level too), same discipline as every other query in this
 * codebase (see queries.ts's opening comment).
 *
 * Known limitation, not addressed here: any org_admin (owner/admin/agent
 * alike) can edit or remove any other member of their org, including an
 * 'owner' — admin_users.role carries no enforcement today, only a label.
 * Flagged in docs/TODO.md rather than silently assumed away.
 */
export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  const viewer = await getOrgAdminOrNull();
  if (!viewer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!UUID_RE.test(params.userId)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  }

  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 });
  }
  if (body.name !== null && typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name must be a string or null' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('admin_users')
    .update({ name: typeof body.name === 'string' ? body.name.trim() || null : null })
    .eq('id', params.userId)
    .eq('organization_id', viewer.organizationId)
    .select('id, name, email, role, is_active')
    .maybeSingle();

  if (error) {
    console.error('[org] update teammate failed', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found in your organization' }, { status: 404 });

  return NextResponse.json({ admin: data });
}

export async function DELETE(_request: Request, { params }: { params: { userId: string } }) {
  const viewer = await getOrgAdminOrNull();
  if (!viewer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!UUID_RE.test(params.userId)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  }
  if (params.userId === viewer.userId) {
    return NextResponse.json({ error: "You can't remove your own account here" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', params.userId)
    .eq('organization_id', viewer.organizationId)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: 'Not found in your organization' }, { status: 404 });
  }

  const { error: rowError } = await supabase
    .from('admin_users')
    .delete()
    .eq('id', params.userId)
    .eq('organization_id', viewer.organizationId);
  if (rowError) {
    console.error('[org] delete teammate row failed', rowError);
    return NextResponse.json({ error: 'Failed to remove teammate' }, { status: 500 });
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(params.userId);
  if (authError) {
    console.error('[org] teammate row deleted but auth user deletion failed', authError);
  }

  return NextResponse.json({ ok: true });
}
