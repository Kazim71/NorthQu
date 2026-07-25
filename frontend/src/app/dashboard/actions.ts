'use server';

import { revalidatePath } from 'next/cache';
import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * Server Actions for the leads table — the dashboard's first WRITE path.
 *
 * These run as the logged-in org admin through the ANON key, so every write
 * is constrained by the same Row Level Security that constrains their reads
 * (the `contacts_update_own_org` policy from 0001_init_schema.sql). That is
 * the deliberate trust boundary: the dashboard never reaches for the
 * service_role key — an org admin can only ever touch their own tenant's
 * rows, enforced by the database, not by this code. The explicit
 * `.eq('organization_id', ...)` below is belt-and-suspenders on top of RLS,
 * and `requireOrgAdmin()` re-checks auth server-side (a client calling the
 * action directly is still gated here, never trusting the browser).
 *
 * Writing `messaged_at` is the missing input that makes the COMPUTED
 * message_status (migration 0006) reach its 'cooldown' / 'messaged' states
 * in normal use — see docs/CHANGELOG.md.
 */

export type LeadActionResult = { ok: true } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function setMessagedAt(contactId: string, value: string | null): Promise<LeadActionResult> {
  if (typeof contactId !== 'string' || !UUID_RE.test(contactId)) {
    return { ok: false, error: 'Invalid contact id' };
  }

  const viewer = await requireOrgAdmin();
  const supabase = createClient();

  const { error } = await supabase
    .from('contacts')
    .update({ messaged_at: value })
    .eq('id', contactId)
    .eq('organization_id', viewer.organizationId);

  if (error) return { ok: false, error: error.message };

  // Leads list + summary both read message_status; refresh the server data.
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/summary');
  return { ok: true };
}

/** Mark a lead as messaged now → status becomes 'cooldown' (then 'messaged' after 48h). */
export async function markLeadMessaged(contactId: string): Promise<LeadActionResult> {
  return setMessagedAt(contactId, new Date().toISOString());
}

/** Clear the messaged flag → status reverts to computed 'ready' / 'none'. */
export async function resetLeadMessaged(contactId: string): Promise<LeadActionResult> {
  return setMessagedAt(contactId, null);
}
