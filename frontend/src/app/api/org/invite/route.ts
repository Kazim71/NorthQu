import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getOrgAdminOrNull } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const ROLES = new Set(['owner', 'admin', 'agent']);

/**
 * POST /api/org/invite — self-service teammate invite, scoped to the
 * caller's OWN org only. Mirrors /api/admin/invite (platform-admin,
 * any org) almost exactly, but organizationId comes from the session
 * (viewer.organizationId), never the request body — an org admin cannot
 * invite someone into a different tenant no matter what they post.
 *
 * Same temp-password pattern as the platform-admin route: no SMTP
 * configured, so inviteUserByEmail() isn't usable yet (see docs/TODO.md).
 */
export async function POST(request: Request) {
  const viewer = await getOrgAdminOrNull();
  if (!viewer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { email?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = typeof body.role === 'string' && ROLES.has(body.role) ? body.role : 'agent';

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const tempPassword = randomBytes(12).toString('base64url');

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createError) {
    if (createError.code === 'email_exists' || createError.status === 422) {
      return NextResponse.json(
        { error: `A user with the email ${email} already exists` },
        { status: 409 },
      );
    }
    console.error('[org] createUser failed', createError);
    return NextResponse.json(
      { error: createError.message || 'Failed to create user' },
      { status: 500 },
    );
  }

  const userId = created.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'User was created without an id' }, { status: 500 });
  }

  const { error: linkError } = await supabase
    .from('admin_users')
    .insert({ id: userId, organization_id: viewer.organizationId, email, role });

  if (linkError) {
    await supabase.auth.admin.deleteUser(userId);
    console.error('[org] admin_users insert failed, rolled back auth user', linkError);
    return NextResponse.json({ error: 'Failed to add teammate' }, { status: 500 });
  }

  return NextResponse.json({ admin: { userId, email, role }, tempPassword }, { status: 201 });
}
