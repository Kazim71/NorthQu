import { NextResponse } from 'next/server';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

// Node runtime, not Edge: the service-role client pulls in `ws`.
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PATCH /api/admin/users/:userId
 * Edit an admin/agent's name, or toggle their access (is_active).
 * Platform admins only.
 *
 * Goes through the service-role client rather than RLS, same reasoning as
 * /api/admin/organizations and /api/admin/invite: a platform admin editing
 * a DIFFERENT org's admin_users row is a cross-tenant write that the
 * existing RLS policies correctly do not grant (see migration 0010's
 * closing note) — this route is the explicit, narrow escape hatch,
 * gated by getPlatformAdminOrNull() before the admin client is ever touched.
 */
export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  const admin = await getPlatformAdminOrNull();
  if (!admin) {
    return NextResponse.json(
      { error: 'Forbidden — platform admin access required' },
      { status: 403 },
    );
  }

  if (!UUID_RE.test(params.userId)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  }

  let body: { name?: unknown; is_active?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 });
  }

  const patch: { name?: string | null; is_active?: boolean } = {};
  if ('name' in body) {
    if (body.name !== null && typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name must be a string or null' }, { status: 400 });
    }
    patch.name = typeof body.name === 'string' ? body.name.trim() || null : null;
  }
  if ('is_active' in body) {
    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 });
    }
    patch.is_active = body.is_active;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('admin_users')
    .update(patch)
    .eq('id', params.userId)
    .select('id, name, email, role, is_active, organization_id')
    .maybeSingle();

  if (error) {
    console.error('[admin] update admin_users failed', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ admin: data });
}

/**
 * DELETE /api/admin/users/:userId
 * Fully removes the admin/agent: both their admin_users row (org
 * membership) and their Supabase Auth account. Hard-to-reverse by design —
 * "toggle access off" (PATCH is_active=false, above) is the reversible
 * action; DELETE is the one a platform admin reaches for when the person
 * is actually gone, not just temporarily suspended.
 */
export async function DELETE(_request: Request, { params }: { params: { userId: string } }) {
  const admin = await getPlatformAdminOrNull();
  if (!admin) {
    return NextResponse.json(
      { error: 'Forbidden — platform admin access required' },
      { status: 403 },
    );
  }

  if (!UUID_RE.test(params.userId)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // admin_users row first: if this fails, we haven't destroyed the auth
  // account yet, so the operation can simply be retried. Deleting the auth
  // user first and having THIS fail would strand an admin_users row
  // pointing at a user that no longer exists.
  const { error: rowError } = await supabase.from('admin_users').delete().eq('id', params.userId);
  if (rowError) {
    console.error('[admin] delete admin_users row failed', rowError);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(params.userId);
  if (authError) {
    // The org membership is already gone (they can no longer see any
    // tenant's data), so this is logged rather than surfaced as a hard
    // failure — a dangling auth user with no admin_users row just lands
    // on /pending if they ever sign in again, same as a fresh signup.
    console.error('[admin] admin_users row deleted but auth user deletion failed', authError);
  }

  return NextResponse.json({ ok: true });
}
