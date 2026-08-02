'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Badge } from './ui/Badge';
import type { BlogPost } from '@/lib/queries';

export function ContentManager({ initialPosts }: { initialPosts: BlogPost[] }) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [topic, setTopic] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch('/api/admin/content/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    setPending(false);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(payload.error ?? 'Failed to generate');
      return;
    }
    setPosts((prev) => [payload.post, ...prev]);
    setTopic('');
  }

  async function updatePost(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/admin/content/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(payload.error ?? 'Failed to update');
      return;
    }
    setPosts((prev) => prev.map((p) => (p.id === id ? payload.post : p)));
    router.refresh();
  }

  async function deletePost(id: string) {
    if (!window.confirm('Delete this post permanently?')) return;
    const res = await fetch(`/api/admin/content/posts/${id}`, { method: 'DELETE' });
    if (res.ok) setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-display text-lg text-black dark:text-neutral-100">
            Generate a draft
          </h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Give it a topic — it drafts a full post. Nothing publishes until you review and hit
            Publish below.
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={generate} className="flex flex-wrap items-end gap-2">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Why most storefronts lose leads before checkout"
              required
              className="min-w-[280px] flex-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-black dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-cinnamon-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Generating…' : 'Generate draft'}
            </button>
          </form>
          {error ? (
            <p className="mt-3 rounded-md bg-brick-100 px-3 py-2 text-xs text-brick-700 dark:bg-brick-900 dark:text-brick-300">
              {error}
            </p>
          ) : null}
        </CardBody>
      </Card>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No posts yet.</p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              editing={editingId === post.id}
              onEdit={() => setEditingId(post.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(patch) => {
                updatePost(post.id, patch);
                setEditingId(null);
              }}
              onPublishToggle={() =>
                updatePost(post.id, { status: post.status === 'published' ? 'draft' : 'published' })
              }
              onDelete={() => deletePost(post.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PostCard({
  post,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onPublishToggle,
  onDelete,
}: {
  post: BlogPost;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: { title: string; content: string }) => void;
  onPublishToggle: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {editing ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-black dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
              />
            ) : (
              <h3 className="font-display text-lg text-black dark:text-neutral-100">{post.title}</h3>
            )}
            <div className="mt-1 flex items-center gap-2">
              <Badge tone={post.status === 'published' ? 'emerald' : 'neutral'}>{post.status}</Badge>
              {post.generated_by_ai ? <Badge tone="violet">AI drafted</Badge> : null}
            </div>
          </div>
          <div className="flex flex-none items-center gap-3">
            {editing ? (
              <>
                <button
                  onClick={() => onSave({ title, content })}
                  className="text-xs font-medium text-cinnamon-600 dark:text-cinnamon-400"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEdit}
                  className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={onEdit} className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Edit
              </button>
            )}
            <button
              onClick={onPublishToggle}
              className="text-xs font-medium text-cinnamon-600 dark:text-cinnamon-400"
            >
              {post.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
            <button onClick={onDelete} className="text-xs font-medium text-brick-600 dark:text-brick-400">
              Delete
            </button>
          </div>
        </div>

        {editing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 font-mono text-xs text-black dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
          />
        ) : (
          <p className="line-clamp-3 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-400">
            {post.content}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
