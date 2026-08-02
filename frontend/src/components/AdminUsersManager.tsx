'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Badge } from './ui/Badge';
import { SecretReveal } from './SecretReveal';
import type { AdminUserRow } from '@/lib/queries';

/**
 * Platform-admin management of one org's admins/agents: edit name, toggle
 * access, delete, and invite a new one — all four scoped to this org
 * (organizationId is fixed, not user-selectable, unlike the platform-wide
 * provisioning form on /super-admin/new-org which has to ask).
 */
export function AdminUsersManager({
  organizationId,
  organizationName,
  initialUsers,
}: {
  organizationId: string;
  organizationName: string;
  initialUsers: AdminUserRow[];
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);

  function replaceUser(updated: AdminUserRow) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  function removeUser(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-xl text-black dark:text-neutral-100">Admins & agents</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {users.length} {users.length === 1 ? 'person has' : 'people have'} a login for{' '}
          {organizationName}.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-2xs uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">Access</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-neutral-500 dark:text-neutral-400">
                    No admins yet — invite one below.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <AdminRow key={u.id} user={u} onUpdated={replaceUser} onDeleted={removeUser} />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <InviteInline
            organizationId={organizationId}
            organizationName={organizationName}
            onCreated={() => router.refresh()}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function AdminRow({
  user,
  onUpdated,
  onDeleted,
}: {
  user: AdminUserRow;
  onUpdated: (u: AdminUserRow) => void;
  onDeleted: (id: string) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(payload.error ?? 'Failed to update');
      return false;
    }
    onUpdated(payload.admin);
    return true;
  }

  async function saveName() {
    const ok = await patch({ name: name.trim() || null });
    if (ok) setEditingName(false);
  }

  async function toggleActive() {
    await patch({ is_active: !user.is_active });
  }

  async function remove() {
    if (
      !window.confirm(
        `Permanently delete ${user.name || user.email}? This removes their login entirely and cannot be undone. Use "Revoke" instead if you just want to suspend access.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? 'Failed to delete');
      return;
    }
    onDeleted(user.id);
  }

  return (
    <tr className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
      <td className="py-2 pr-4">
        {editingName ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName();
                if (e.key === 'Escape') {
                  setName(user.name ?? '');
                  setEditingName(false);
                }
              }}
              className="w-32 rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-black dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
            />
            <button
              onClick={saveName}
              disabled={busy}
              className="text-xs font-medium text-cinnamon-600 hover:text-cinnamon-700 dark:text-cinnamon-400"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-left text-neutral-800 hover:text-cinnamon-700 dark:text-neutral-200 dark:hover:text-cinnamon-400"
          >
            {user.name || <span className="italic text-neutral-400">Add name</span>}
          </button>
        )}
      </td>
      <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">{user.email}</td>
      <td className="py-2 pr-4">
        <Badge tone="neutral">{user.role}</Badge>
      </td>
      <td className="py-2 pr-4">
        <button
          onClick={toggleActive}
          disabled={busy}
          className="inline-flex items-center gap-1.5"
          title={user.is_active ? 'Click to revoke access' : 'Click to restore access'}
        >
          <span
            className={`relative inline-flex h-5 w-9 flex-none items-center rounded-full transition-colors ${
              user.is_active ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                user.is_active ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </span>
          <span
            className={`text-xs ${user.is_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-500 dark:text-neutral-400'}`}
          >
            {user.is_active ? 'Active' : 'Revoked'}
          </span>
        </button>
      </td>
      <td className="py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={remove}
            disabled={busy}
            className="text-xs font-medium text-brick-600 hover:text-brick-700 dark:text-brick-400"
          >
            Delete
          </button>
        </div>
        {error ? <p className="mt-1 text-xs text-brick-600 dark:text-brick-400">{error}</p> : null}
      </td>
    </tr>
  );
}

function InviteInline({
  organizationId,
  organizationName,
  onCreated,
}: {
  organizationId: string;
  organizationName: string;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('agent');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, organizationId, role }),
    });
    const payload = await res.json();
    setPending(false);

    if (!res.ok) {
      setError(payload.error ?? 'Failed to invite admin');
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
            Invite to {organizationName}
          </span>
          <input
            type="email"
            required
            placeholder="person@client.com"
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
