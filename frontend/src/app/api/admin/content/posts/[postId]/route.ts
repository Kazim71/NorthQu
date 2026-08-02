import { NextResponse } from 'next/server';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PATCH /api/admin/content/posts/:postId — edit title/content, or publish
 * (status: 'published' sets published_at; back to 'draft' clears it). */
export async function PATCH(request: Request, { params }: { params: { postId: string } }) {
  const admin = await getPlatformAdminOrNull();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!UUID_RE.test(params.postId)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
  }

  let body: { title?: unknown; content?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.content === 'string') patch.content = body.content;
  if (body.status === 'published' || body.status === 'draft') {
    patch.status = body.status;
    patch.published_at = body.status === 'published' ? new Date().toISOString() : null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .update(patch)
    .eq('id', params.postId)
    .select('id, title, slug, content, status, generated_by_ai, created_at, published_at')
    .maybeSingle();

  if (error) {
    console.error('[content] update post failed', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ post: data });
}

export async function DELETE(_request: Request, { params }: { params: { postId: string } }) {
  const admin = await getPlatformAdminOrNull();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!UUID_RE.test(params.postId)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('blog_posts').delete().eq('id', params.postId);
  if (error) {
    console.error('[content] delete post failed', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
