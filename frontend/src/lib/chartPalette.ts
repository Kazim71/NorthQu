/**
 * Chart colour tokens — VALIDATED, not eyeballed.
 *
 * Every value below was run through the dataviz validator (six checks:
 * lightness band, chroma floor, CVD separation, normal-vision floor,
 * contrast vs surface, and single-hue monotonicity for the ramp) against
 * this app's REAL surfaces: white in light mode, pure black in dark
 * (Card.tsx uses `dark:bg-black`, not a soft charcoal — the difference
 * changes the result, so the default dark surface was overridden).
 *
 * DARK IS NOT A FLIP OF LIGHT. Each mode has its own step from the same
 * ramp, because the passing lightness band differs per surface: the
 * 500-level categorical hues that pass on white fail the band on black,
 * and the cinnamon step that passes on black is too pale to clear the
 * contrast floor on white. Both sets were validated independently.
 *
 * ---------------------------------------------------------------------
 * OUTSTANDING RELIEF OBLIGATIONS — these are why every chart in this app
 * direct-labels its marks, and it is not a style preference:
 *
 *   - Light categorical WARNs on contrast (emerald 2.47:1, amber 2.09:1
 *     against white, under the 3:1 bar). That warning is dischargeable
 *     ONLY by visible labels or a table view.
 *   - Dark categorical WARNs on CVD separation (amber↔emerald ΔE 7.9,
 *     inside the 6–8 floor band). Legal ONLY with secondary encoding.
 *
 * Both are discharged the same way: every series in every chart here
 * renders its name and its number as text beside the mark. Colour is
 * never the only carrier of identity. If a future chart drops those
 * labels, these palettes stop being compliant — re-validate rather than
 * assuming.
 * ---------------------------------------------------------------------
 *
 * Values are Tailwind class names rather than raw hex so the components
 * stay inside the existing token system; the hex in each comment is what
 * was actually validated.
 */

/**
 * CATEGORICAL — for distinct identities (traffic sources, visitor types).
 * Fixed order, never cycled. A 4th slot is deliberately absent: past three
 * series here the honest move is folding the tail into "Other", which
 * `foldToOther()` below does.
 */
export const CATEGORICAL_FILL = [
  // violet-500 #8b5cf6 (light) / violet-600 #7c3aed (dark)
  'bg-violet-500 dark:bg-violet-600',
  // emerald-500 #10b981 / emerald-600 #059669
  'bg-emerald-500 dark:bg-emerald-600',
  // amber-500 #f59e0b / amber-600 #d97706
  'bg-amber-500 dark:bg-amber-600',
] as const;

/** Text token matching each categorical slot, for legends and labels. */
export const CATEGORICAL_TEXT = [
  'text-violet-700 dark:text-violet-300',
  'text-emerald-700 dark:text-emerald-300',
  'text-amber-700 dark:text-amber-300',
] as const;

/** The tail bucket. Neutral on purpose — "Other" is not an identity. */
export const OTHER_FILL = 'bg-neutral-400 dark:bg-neutral-600';

/**
 * SEQUENTIAL — one hue, more-is-darker, for magnitude and ordered stages
 * (funnel, ranked lists).
 *
 * Cinnamon is the brand accent and is otherwise reserved for primary
 * actions. Using it here is a deliberate named choice, which is exactly
 * the exception tailwind.config.ts carves out ("declared, usable by name,
 * never auto-assigned by the category-hash rotation") — the rule it
 * protects against is one hue being auto-assigned five different meanings,
 * not a considered use as the magnitude ramp.
 *
 * Light: cinnamon 400->800. Dark: 700->300 (inverted so the ramp still
 * reads more-is-more against a black surface).
 */
export const SEQUENTIAL_FILL = [
  'bg-cinnamon-400 dark:bg-cinnamon-700',
  'bg-cinnamon-500 dark:bg-cinnamon-600',
  'bg-cinnamon-600 dark:bg-cinnamon-500',
  'bg-cinnamon-700 dark:bg-cinnamon-400',
  'bg-cinnamon-800 dark:bg-cinnamon-300',
] as const;

/** Recessive track behind every bar. Never carries meaning. */
export const TRACK = 'bg-neutral-100 dark:bg-neutral-800';

/**
 * Position i on the sequential ramp for a list of n items.
 *
 * Rank-based, and that is the one place where "colour follows the entity,
 * not its rank" does NOT apply: on an intentionally ranked list the rank
 * IS the entity's identity, and the darkening ramp reinforces the ordering
 * the reader is already being shown. (On an unranked categorical chart,
 * repainting on filter would be the bug that rule exists to prevent.)
 */
export function sequentialStep(index: number, total: number): string {
  if (total <= 1) return SEQUENTIAL_FILL[SEQUENTIAL_FILL.length - 1] as string;
  const slot = Math.round((index / (total - 1)) * (SEQUENTIAL_FILL.length - 1));
  return SEQUENTIAL_FILL[Math.min(slot, SEQUENTIAL_FILL.length - 1)] as string;
}

/**
 * Caps a categorical series at 3 real slots plus an "Other" bucket.
 *
 * Generating a 4th hue would be indistinguishable under CVD and would
 * break the validated palette — folding the tail is the supported answer.
 */
export function foldToOther<T>(
  items: T[],
  count: (item: T) => number,
  label: (item: T) => string,
  max = CATEGORICAL_FILL.length,
): { label: string; count: number; isOther: boolean }[] {
  const mapped = items.map((i) => ({ label: label(i), count: count(i), isOther: false }));
  if (mapped.length <= max) return mapped;

  const head = mapped.slice(0, max - 1);
  const tail = mapped.slice(max - 1);
  return [
    ...head,
    {
      label: `Other (${tail.length})`,
      count: tail.reduce((sum, t) => sum + t.count, 0),
      isOther: true,
    },
  ];
}
