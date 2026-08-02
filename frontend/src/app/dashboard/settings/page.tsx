import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganization, getOrganizationApiKey } from '@/lib/queries';
import { OrgSettingsForm } from '@/components/OrgSettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const viewer = await requireOrgAdmin();
  const supabase = createClient();
  const [org, apiKey] = await Promise.all([
    getOrganization(supabase, viewer.organizationId),
    getOrganizationApiKey(supabase, viewer.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-black dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Organization details and your tracking snippet's API key.
        </p>
      </div>
      <OrgSettingsForm
        initialName={org?.name ?? ''}
        initialIndustry={org?.industry ?? ''}
        initialApiKey={apiKey ?? ''}
      />
    </div>
  );
}
