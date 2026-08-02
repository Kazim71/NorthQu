import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getAdminUsers, getOrganization } from '@/lib/queries';
import { TeamManager } from '@/components/TeamManager';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const viewer = await requireOrgAdmin();
  const supabase = createClient();
  const [org, teammates] = await Promise.all([
    getOrganization(supabase, viewer.organizationId),
    getAdminUsers(supabase, viewer.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-black dark:text-white">Team</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Who has a login for {org?.name ?? 'your organization'}.
        </p>
      </div>
      <TeamManager currentUserId={viewer.userId} initialTeammates={teammates} />
    </div>
  );
}
