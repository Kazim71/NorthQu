'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from './ui/Card';

export function OrgSettingsForm({
  initialName,
  initialIndustry,
  initialApiKey,
}: {
  initialName: string;
  initialIndustry: string;
  initialApiKey: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <OrgDetailsCard initialName={initialName} initialIndustry={initialIndustry} />
      <ApiKeyCard initialApiKey={initialApiKey} />
    </div>
  );
}

function OrgDetailsCard({
  initialName,
  initialIndustry,
}: {
  initialName: string;
  initialIndustry: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [industry, setIndustry] = useState(initialIndustry);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    const res = await fetch('/api/org/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, industry }),
    });
    setPending(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? 'Failed to save');
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg text-black dark:text-neutral-100">
          Organization details
        </h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-2xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Company name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-black dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-2xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Industry
            </span>
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="ecommerce"
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-black dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
            />
          </label>
          {error ? (
            <p className="rounded-md bg-brick-100 px-3 py-2 text-xs text-brick-700 dark:bg-brick-900 dark:text-brick-300">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-cinnamon-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
          </button>
        </form>
      </CardBody>
    </Card>
  );
}

function ApiKeyCard({ initialApiKey }: { initialApiKey: string }) {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function rotate() {
    if (
      !window.confirm(
        'Rotating the API key immediately invalidates the old one. Your live tracking snippet will stop sending data until you paste the new key in. Continue?',
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch('/api/org/settings/rotate-key', { method: 'POST' });
    setPending(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? 'Failed to rotate key');
      return;
    }
    const payload = await res.json();
    setApiKey(payload.api_key);
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg text-black dark:text-neutral-100">Tracking API key</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Used in your storefront's <code>window.leadpulseConfig</code>. Anyone with this key can
          send events into your account — treat it like a public tracking id, not a secret
          password (see docs for why).
        </p>
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded border border-neutral-200 bg-white px-3 py-2 font-mono text-xs text-black dark:border-neutral-700 dark:bg-black dark:text-neutral-100">
            {apiKey || '—'}
          </code>
          <button
            type="button"
            onClick={copy}
            className="flex-none rounded-md bg-black px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-black dark:hover:bg-white"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {error ? (
          <p className="rounded-md bg-brick-100 px-3 py-2 text-xs text-brick-700 dark:bg-brick-900 dark:text-brick-300">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={rotate}
          disabled={pending}
          className="rounded-md border border-brick-300 px-4 py-2 text-xs font-medium text-brick-700 transition-colors hover:bg-brick-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brick-700 dark:text-brick-400 dark:hover:bg-brick-900/40"
        >
          {pending ? 'Rotating…' : 'Rotate key'}
        </button>
      </CardBody>
    </Card>
  );
}
