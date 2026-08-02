'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from './ui/Card';
import type { OrganizationAdminFields } from '@/lib/queries';

const SERVICES: { key: keyof Omit<OrganizationAdminFields, 'ingestion_paused'>; label: string; builtYet: boolean }[] =
  [
    { key: 'has_leadpulse', label: 'LeadPulse', builtYet: true },
    { key: 'has_automation', label: 'Automation', builtYet: false },
    { key: 'has_web_services', label: 'Web Services', builtYet: false },
    { key: 'has_crm', label: 'CRM', builtYet: false },
  ];

/**
 * Which of the /app service hub's cards show up as "Active" for this org.
 * Automation/Web Services/CRM are shown DISABLED here, not hidden — a
 * platform admin can technically flip them on today, but the hub card
 * still won't be clickable until those products actually exist (see
 * ServiceDef.builtYet in app/app/page.tsx). Kept visible with a note
 * rather than removed entirely, so this control doesn't need a second
 * migration the day those products ship.
 */
export function ServiceFlagsToggle({
  organizationId,
  initial,
}: {
  organizationId: string;
  initial: Omit<OrganizationAdminFields, 'ingestion_paused'>;
}) {
  const router = useRouter();
  const [flags, setFlags] = useState(initial);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function toggle(key: keyof typeof flags) {
    setPendingKey(key);
    const next = !flags[key];
    const res = await fetch(`/api/admin/organizations/${organizationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: next }),
    });
    setPendingKey(null);
    if (res.ok) {
      setFlags((prev) => ({ ...prev, [key]: next }));
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg text-black dark:text-neutral-100">
          Services enabled
        </h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Which cards this org sees as active on their /app hub after login.
        </p>
      </CardHeader>
      <CardBody className="flex flex-wrap gap-2">
        {SERVICES.map((s) => (
          <button
            key={s.key}
            onClick={() => toggle(s.key)}
            disabled={pendingKey === s.key}
            title={s.builtYet ? undefined : 'Product not built yet — flag has no effect until it ships'}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              flags[s.key]
                ? 'border-cinnamon-300 bg-cinnamon-50 text-cinnamon-800 dark:border-cinnamon-800 dark:bg-cinnamon-950 dark:text-cinnamon-300'
                : 'border-neutral-200 bg-white text-neutral-500 dark:border-neutral-700 dark:bg-black dark:text-neutral-400'
            } ${s.builtYet ? '' : 'italic'}`}
          >
            {s.label} {flags[s.key] ? '✓' : ''}
          </button>
        ))}
      </CardBody>
    </Card>
  );
}
