'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Badge } from './ui/Badge';
import { SecretReveal } from './SecretReveal';
import type { AdminUserRow } from '@/lib/queries';

/**
 * Self-service teammate management, scoped to the caller's own org via
 * /api/org/* (not /api/admin/* — that's the platform-admin, cross-org
 * version this component deliberately does not reuse, since mixing the
 * two would mean this client component needs to know which org it's
 * allowed to touch, and the whole point of the /api/org/* routes is that
 * they decide that server-side from the session instead).
 */
export function TeamManager({
  currentUserId,
  initialTeammates,
}: {
  currentUserId: string;
  initialTeammates: AdminUserRow[];
}) {
  const router = useRouter();
  const [teammates, setTeammates] = useState(initialTeammates);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-xl text-black dark:text-neutral-100">Teammates</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {teammates.length} {teammates.length === 1 ? 'person has' : 'people have'} access.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Table on sm+ screens. Below sm, a table forces either horizontal
            scroll or clipped columns for what's normally a handful of
            rows — a stacked card per person reads far better at phone
            width, so that's the <640px layout instead (below), not a
            scrollable version of the same table. */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-2xs uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teammates.map((t) => (
                <TeammateRow
                  key={t.id}
                  teammate={t}
                  isSelf={t.id === currentUserId}
                  onUpdated={(u) => setTeammates((prev) => prev.map((p) => (p.id === u.id ? u : p)))}
                  onRemoved={(id) => setTeammates((prev) => prev.filter((p) => p.id !== id))}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 sm:hidden">
          {teammates.map((t) => (
            <TeammateCard
              key={t.id}
              teammate={t}
              isSelf={t.id === currentUserId}
              onUpdated={(u) => setTeammates((prev) => prev.map((p) => (p.id === u.id ? u : p)))}
              onRemoved={(id) => setTeammates((prev) => prev.filter((p) => p.id !== id))}
            />
          ))}
        </div>

        <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <InviteTeammate onCreated={() => router.refresh()} />
        </div>
      </CardBody>
    </Card>
  );
}

/** Shared edit/remove logic for one teammate — used by both the table row
 * (sm+) and the stacked card (below sm) presentations, so the two layouts
 * can't drift into different behavior. */
function useTeammateActions(
  teammate: AdminUserRow,
  onUpdated: (t: AdminUserRow) => void,
  onRemoved: (id: string) => void,
) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(teammate.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveName() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/org/users/${teammate.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() || null }),
    });
    setBusy(false);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(payload.error ?? 'Failed to save');
      return;
    }
    onUpdated(payload.admin);
    setEditing(false);
  }

  async function remove() {
    if (!window.confirm(`Remove ${teammate.name || teammate.email}? This deletes their login entirely.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/org/users/${teammate.id}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? 'Failed to remove');
      return;
    }
    onRemoved(teammate.id);
  }

  return { editing, setEditing, name, setName, busy, error, saveName, remove };
}

function TeammateCard({
  teammate,
  isSelf,
  onUpdated,
  onRemoved,
}: {
  teammate: AdminUserRow;
  isSelf: boolean;
  onUpdated: (t: AdminUserRow) => void;
  onRemoved: (id: string) => void;
}) {
  const { editing, setEditing, name, setName, busy, error, saveName, remove } = useTeammateActions(
    teammate,
    onUpdated,
    onRemoved,
  );

  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                className="w-28 rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-black dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
              />
              <button onClick={saveName} disabled={busy} className="text-xs font-medium text-cinnamon-600 dark:text-cinnamon-400">
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="truncate text-left text-sm font-medium text-neutral-800 hover:text-cinnamon-700 dark:text-neutral-200 dark:hover:text-cinnamon-400"
            >
              {teammate.name || <span className="italic text-neutral-400">Add name</span>}
              {isSelf ? <span className="ml-1.5 text-2xs text-neutral-400">(you)</span> : null}
            </button>
          )}
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">{teammate.email}</p>
        </div>
        <Badge tone="neutral">{teammate.role}</Badge>
      </div>
      {!isSelf && (
        <button
          onClick={remove}
          disabled={busy}
          className="mt-2 text-xs font-medium text-brick-600 hover:text-brick-700 dark:text-brick-400"
        >
          Remove
        </button>
      )}
      {error ? <p className="mt-1 text-xs text-brick-600 dark:text-brick-400">{error}</p> : null}
    </div>
  );
}

function TeammateRow({
  teammate,
  isSelf,
  onUpdated,
  onRemoved,
}: {
  teammate: AdminUserRow;
  isSelf: boolean;
  onUpdated: (t: AdminUserRow) => void;
  onRemoved: (id: string) => void;
}) {
  const { editing, setEditing, name, setName, busy, error, saveName, remove } = useTeammateActions(
    teammate,
    onUpdated,
    onRemoved,
  );

  return (
    <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
      <td className="py-2 pr-4">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              className="w-32 rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-black dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
            />
            <button onClick={saveName} disabled={busy} className="text-xs font-medium text-cinnamon-600 dark:text-cinnamon-400">
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-left text-neutral-800 hover:text-cinnamon-700 dark:text-neutral-200 dark:hover:text-cinnamon-400"
          >
            {teammate.name || <span className="italic text-neutral-400">Add name</span>}
            {isSelf ? <span className="ml-1.5 text-2xs text-neutral-400">(you)</span> : null}
          </button>
        )}
      </td>
      <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{teammate.email}</td>
      <td className="py-2 pr-4">
        <Badge tone="neutral">{teammate.role}</Badge>
      </td>
      <td className="py-2">
        {!isSelf && (
          <button
            onClick={remove}
            disabled={busy}
            className="text-xs font-medium text-brick-600 hover:text-brick-700 dark:text-brick-400"
          >
            Remove
          </button>
        )}
        {error ? <p className="mt-1 text-xs text-brick-600 dark:text-brick-400">{error}</p> : null}
      </td>
    </tr>
  );
}

function InviteTeammate({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('agent');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch('/api/org/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    const payload = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(payload.error ?? 'Failed to invite');
      return;
    }
    setResult({ email: payload.admin.email, tempPassword: payload.tempPassword });
    setEmail('');
    onCreated();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Invite a teammate
          </span>
          <input
            type="email"
            required
            placeholder="teammate@yourcompany.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-56 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-black dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
          />
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-black dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
        >
          <option value="owner">owner</option>
          <option value="admin">admin</option>
          <option value="agent">agent</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-cinnamon-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Working…' : 'Invite'}
        </button>
      </form>
      {error ? (
        <p className="rounded-md bg-brick-100 px-3 py-2 text-xs text-brick-700 dark:bg-brick-900 dark:text-brick-300">
          {error}
        </p>
      ) : null}
      {result ? (
        <SecretReveal
          label={`Temporary password for ${result.email}`}
          value={result.tempPassword}
          note="Shown once. Send it to them over a secure channel."
        />
      ) : null}
    </div>
  );
}
