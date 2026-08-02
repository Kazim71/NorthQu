import { NextResponse } from 'next/server';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * POST /api/admin/content/generate — { topic } -> a draft blog_posts row.
 * Platform-admin only, internal tool (NorthQu's own /insights, see
 * migration 0011). Calls Anthropic's Messages API directly via fetch
 * rather than the @anthropic-ai/sdk package — one call site, plain REST,
 * not worth a new dependency for.
 *
 * Fails honestly, not silently, if ANTHROPIC_API_KEY isn't set: a 503
 * naming exactly what's missing, matching this codebase's existing
 * convention for optional external integrations (see
 * SHOPIFY_WEBHOOK_SECRET's fail-closed 503 in the backend). No content is
 * ever fabricated as a fallback.
 */
export async function POST(request: Request) {
  const admin = await getPlatformAdminOrNull();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'AI content generation is not configured — ANTHROPIC_API_KEY is not set on this deployment.',
      },
      { status: 503 },
    );
  }

  let body: { topic?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 });
  }

  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  if (!topic) {
    return NextResponse.json({ error: 'A topic is required' }, { status: 400 });
  }

  const prompt = `Write a blog post for NorthQu, a technology company that builds software, AI automation, lead-tracking systems, and websites for businesses. The post is about: "${topic}".

Write for a business-owner audience, not developers. Be concrete and specific, not generic marketing filler. Do not invent specific client names, numbers, or case studies that aren't given to you.

Respond with exactly two lines first, then the body:
TITLE: <a concise, real title>
---
<the full post body in markdown, 400-700 words>`;

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (err) {
    console.error('[content] Anthropic request failed', err);
    return NextResponse.json({ error: 'Failed to reach the AI provider' }, { status: 502 });
  }

  if (!anthropicRes.ok) {
    const text = await anthropicRes.text().catch(() => '');
    console.error('[content] Anthropic API error', anthropicRes.status, text);
    return NextResponse.json({ error: 'AI generation request failed' }, { status: 502 });
  }

  const data = await anthropicRes.json();
  const raw: string = data?.content?.[0]?.text ?? '';
  const titleMatch = raw.match(/^TITLE:\s*(.+)$/m);
  const title = titleMatch?.[1]?.trim() || topic;
  const content = raw.split('---').slice(1).join('---').trim() || raw;

  const supabase = createAdminClient();
  const { data: post, error } = await supabase
    .from('blog_posts')
    .insert({
      title,
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      content,
      status: 'draft',
      generated_by_ai: true,
    })
    .select('id, title, slug, content, status, generated_by_ai, created_at, published_at')
    .single();

  if (error) {
    console.error('[content] insert draft failed', error);
    return NextResponse.json({ error: 'Generated content but failed to save it' }, { status: 500 });
  }

  return NextResponse.json({ post }, { status: 201 });
}
