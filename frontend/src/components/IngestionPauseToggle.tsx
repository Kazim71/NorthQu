'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody } from './ui/Card';

/**
 * Platform-admin kill switch for one tenant's event ingestion (migration
 * 0010, enforced in backend/src/middleware/resolveOrg.ts). Existing data
 * stays fully visible either way — this only stops NEW events from being
 * accepted, so it's safe to flip without losing anything.
 */
export function IngestionPauseToggle({
  organizationId,
  initialPaused,
}: {
  organizationId: string;
  initialPaused: boolean;
}) {
  const router = useRouter();
  const [paused, setPaused] = useState(initialPaused);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    const next = !paused;

    const res = await fetch(`/api/admin/organizations/${organizationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingestion_paused: next }),
    });

    setPending(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? 'Failed to update');
      return;
    }

    setPaused(next);
    router.refresh();
  }

  return (
    <Card>
      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-black dark:text-neutral-100">
            Lead data ingestion
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {paused
              ? 'Paused — the tracking snippet is being rejected. Existing data is still fully visible below.'
              : 'Active — new events and identifies are being accepted normally.'}
          </p>
          {error ? (
            <p className="mt-1 text-xs text-brick-600 dark:text-brick-400">{error}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={`flex-none rounded-md px-4 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            paused
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-neutral-800 text-white hover:bg-black dark:bg-neutral-200 dark:text-black dark:hover:bg-white'
          }`}
        >
          {pending ? 'Working…' : paused ? 'Resume ingestion' : 'Pause ingestion'}
        </button>
      </CardBody>
    </Card>
  );
}
