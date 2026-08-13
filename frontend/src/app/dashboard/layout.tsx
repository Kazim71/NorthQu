import { requireOrgAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganization, getReadySignal } from '@/lib/queries';
import { AppShell } from '@/components/AppShell';
import {
  LeadsIcon,
  SummaryIcon,
  ChevronLeftIcon,
  AnalyticsIcon,
  SettingsIcon,
  TeamIcon,
} from '@/components/icons';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Gate runs before any child renders. organizationId comes from the
  // session's admin_users row — there is no URL param to tamper with.
  const viewer = await requireOrgAdmin();
  const supabase = createClient();
  const [org, readyLeads] = await Promise.all([
    getOrganization(supabase, viewer.organizationId),
    getReadySignal(supabase, viewer.organizationId),
  ]);

  return (
    <AppShell
      navItems={[
        // Not a real dashboard section — a way back to the /app service
        // hub, now that login lands there instead of straight into
        // LeadPulse. Sits above the real nav items so it reads as "leave
        // this product," not as a fourth peer section.
        { href: '/app', label: 'All services', icon: <ChevronLeftIcon /> },
        // "Leads", not "Visitors": this view shows ONLY people who have
        // given up contact details (getVisitors' identifiedOnly). Anonymous
        // browsing still drives every aggregate on Summary/Analytics — it
        // just doesn't belong in a list an agent works down to call people.
        { href: '/dashboard', label: 'Leads', icon: <LeadsIcon /> },
        { href: '/dashboard/summary', label: 'Summary', icon: <SummaryIcon /> },
        { href: '/dashboard/analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
        { href: '/dashboard/team', label: 'Team', icon: <TeamIcon /> },
        { href: '/dashboard/settings', label: 'Settings', icon: <SettingsIcon /> },
      ]}
      contextLabel={org?.name ?? 'Your organization'}
      contextSublabel="Organization"
      email={viewer.email}
      notifications={readyLeads}
    >
      {children}
    </AppShell>
  );
}
