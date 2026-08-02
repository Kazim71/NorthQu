import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getOrgAdminOrNull } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * POST /api/org/settings/rotate-key — replaces the org's api_key with a
 * fresh one. Separate endpoint from PATCH /api/org/settings (not folded
 * into a generic PATCH) because this is a genuinely more consequential
 * action: the OLD key stops working immediately, and the live tracking
 * snippet on the client's storefront needs to be re-pasted with the new
 * one — same "shown once, act on it now" pattern as invite's temp
 * password (SecretReveal.tsx).
 *
 * Generated in Node rather than via SQL default, matching the exact format
 * migration 0001's `encode(gen_random_bytes(24),'hex')` produces (24 bytes
 * -> 48 hex chars), so both code paths that ever create an api_key agree.
 */
export async function POST() {
  const viewer = await getOrgAdminOrNull();
  if (!viewer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const newKey = randomBytes(24).toString('hex');
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('organizations')
    .update({ api_key: newKey })
    .eq('id', viewer.organizationId)
    .select('api_key')
    .maybeSingle();

  if (error) {
    console.error('[org] rotate api_key failed', error);
    return NextResponse.json({ error: 'Failed to rotate key' }, { status: 500 });
  }

  return NextResponse.json({ api_key: data?.api_key });
}
