# Session handoff — 2026-07-24

Working note for picking this project back up in a new chat. Not a
standing doc like CHANGELOG.md/TODO.md — delete or ignore once the
context has transferred.

## What this project is

**NorthQu** (folder/repo still named `leadpulse`, unrelated to display
name — see README.md) — a multi-tenant lead-capture platform. A tracking
snippet records anonymous storefront visitor behavior; when a visitor
identifies themselves (phone/email), that identity gets linked to
everything they did anonymously before. Backend (Express, deployed on
Render) + Supabase (Postgres/Auth/RLS) + Next.js frontend (App Router).

Full architecture, phase history, and every prior decision's reasoning
live in `docs/CHANGELOG.md` (long, detailed, reverse-chronological) and
`docs/TODO.md` (everything deferred/blocked, with why). Read those for
anything older than this session — this file only covers **today**.

## What happened this session, in order

1. **Rebrand: Northcue → NorthQu.** Renamed every user-facing string,
   `package.json`. Chose Palette A (Cinnamon Wood `#C67155` over Space
   Indigo `#293049`) for the new brand system (`brand.*` tokens in
   `tailwind.config.ts`).
2. **Logo, first pass:** built a hand-drawn vector SVG mark (ring +
   accent tail). User then supplied a Canva export instead; I found it
   had a hidden opaque background layer and was raster (bevels/gradients
   baked in), flagged it, user explicitly chose to proceed with it
   anyway. Shipped as two flattened PNGs (light/dark variant, dark
   variant made by inverting low-saturation pixels for dark-surface
   legibility).
3. **Cross-cutting theme-consistency pass:** the rebrand had only
   touched marketing pages — `login/`, `dashboard/`, `super-admin/` were
   still on the OLD palette (`ink`/`blush`/`lilac`/`mint`/`peach`
   tokens). Migrated all of it: `ink`→literal white/black + Tailwind's
   stock `neutral`; `blush`→new `cinnamon` ramp (also fixed one
   hardcoded hex in a recharts SVG fill, invisible to a class-name
   grep); `lilac`/`mint`/`peach`→Tailwind stock `violet`/`emerald`/
   `amber` (3-hue categorical rotation now, not 4 — `blush` used to
   double as both the primary accent AND a category-tag hue; folding
   `cinnamon` into that rotation too would recreate "one hue, many
   meanings"). Also fixed: marketing site was dark-only by an earlier
   deliberate decision — reversed per explicit instruction, now
   light-default with the same `ThemeToggle` the dashboard uses; fixed
   a sticky-header bug (had blur/bg styling for scrolling but no
   `position` class at all, so it just scrolled away — added
   `sticky top-0 z-40`).
4. **Same-day color correction:** first pass got two rules backwards.
   Corrected: **footer is Space Indigo, unconditionally, in BOTH light
   and dark mode** (not black); **marketing dark mode matches the
   dashboard's dark mode exactly (black)**, not Space Indigo — Indigo is
   now ONLY the footer's color, nothing else.
5. **Footer logo bug:** footer was rendering the icon-only mark with no
   "NorthQu" wordmark next to it. Fixed to the full lockup.
6. **New logo assets supplied by the user** (between messages, this
   session): a proper NQ monogram (an interlocking N+Q line-art design)
   and a full lockup (monogram + "NorthQu" wordmark baked into one
   image), each already in light/dark variants processed to genuinely
   transparent PNGs (`public/brand/northqu-{mark,lockup}-{light,dark}.png`).
   `Logo.tsx` was rewritten around these — see its own doc comment for
   the full mechanism (`ThemedImage` swaps light/dark via CSS `dark:`
   classes, `forceVariant` pins one explicitly for surfaces like the
   footer that don't follow the page's own theme toggle).
7. **Favicon fix (most recent):** `src/app/icon.png`/`apple-icon.png`
   were the light (near-black) mark variant — invisible on dark
   browser-tab chrome. Swapped to the dark (white) variant, verified by
   direct render against black/indigo/white swatches first.

## Current state — what's true right now

- **Brand tokens** (`frontend/tailwind.config.ts`): `brand.{indigo,
  white,cinnamon,cinnamonHover,black,ivory}`, plus a full `cinnamon`
  50–950 ramp. `marketing.*` is now scoped to `SiteFooter` ONLY
  (unconditional Indigo bg + its ivory-family text/border, contrast-
  tuned against Indigo specifically) — nothing else on the marketing
  site uses it.
- **The rule, as it stands everywhere (marketing + dashboard, light +
  dark):** white bg / black text (light); black bg / white text
  (dark); footer is Space Indigo in BOTH modes, always; buttons/primary
  actions are Cinnamon Wood; ivory is secondary-section-only.
- **Logo**: `frontend/src/components/Logo.tsx` exports `LogoMark`
  (standalone NQ monogram — favicon, collapsed sidebar) and
  `LogoLockup` (monogram + "NorthQu" wordmark baked into the image, NOT
  live text anymore — that changed with the newest asset swap). Both
  are raster PNGs under `frontend/public/brand/`, light+dark variants,
  swapped via CSS `dark:` classes.
- **Favicon**: `src/app/icon.png`/`apple-icon.png` = the dark (white)
  mark variant, as of this session's last fix.
- Full grep-verified: zero references to any deprecated token
  (`ink-`/`blush-`/`lilac-`/`mint-`/`peach-`) anywhere in `frontend/src`.
- `tsc --noEmit` and `npm run build` both clean as of the last check
  this session.
- Verification scripts written this session, all still in
  `frontend/test/`: `verify-northqu-rebrand.mjs`,
  `verify-theme-consistency.mjs` (30 checks — footer color, dark-mode
  parity with dashboard, sticky header via real scroll, logo presence,
  contrast ratios), plus older `verify-marketing-redesign.mjs` /
  `verify-rebrand.mjs` from prior sessions.

## What's NOT done / likely next

- **Not re-verified after the two most recent changes** (new logo asset
  swap, favicon fix) with the full Puppeteer suite — worth a rerun of
  `verify-theme-consistency.mjs` before trusting it blindly, since the
  logo-rendering assertions in that script still reference the OLD
  asset path pattern in places and may need updating for the new
  `northqu-mark-*`/`northqu-lockup-*` filenames.
- `docs/TODO.md` still lists (unrelated to this session's work):
  SMTP not configured (contact form + admin invites), no CSV export,
  no idempotency keys on ingestion, Shopify snippets never pasted into
  a real theme, dashboard UI/UX feature pass (calendar date-range
  picker, radial "Identified %" stat, sparklines, sortable leads
  table) — all still open.
- Domain/trademark clearance for "NorthQu" — still unverified, still
  the user's responsibility (noted in TODO.md).
- No commits have been made this session (per repo convention: commits
  only happen when the user explicitly asks).

## Where to look first in a new session

1. `docs/CHANGELOG.md` — full reasoning for every decision above, in
   far more detail than this file.
2. `docs/TODO.md` — the standing list of deferred/blocked items.
3. `frontend/src/components/Logo.tsx` — read its own doc comment before
   touching the logo again; it explains the asset-swap mechanism.
4. `frontend/tailwind.config.ts` — read the top-of-file comment block
   before touching colors; it has the full history of what changed and
   why, including the two corrections.
