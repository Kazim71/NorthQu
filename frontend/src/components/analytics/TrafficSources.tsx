import { Card, CardBody, CardHeader } from '../ui/Card';
import { CATEGORICAL_FILL, OTHER_FILL, TRACK, foldToOther } from '@/lib/chartPalette';
import type { TrafficSource } from '@/lib/queries';

/**
 * Where visitors came from — categorical, because these ARE distinct
 * identities (Google is not "more" than Instagram) rather than one
 * quantity at different sizes.
 *
 * Capped at three hues plus "Other": a fourth generated hue would be
 * indistinguishable under colour-vision deficiency and would break the
 * validated palette. Every row is direct-labelled with its name and count,
 * which is what makes the palette's contrast relief legitimate — colour
 * here is reinforcement, never the only way to tell rows apart.
 */
export function TrafficSources({ sources }: { sources: TrafficSource[] }) {
  const folded = foldToOther(
    sources,
    (s) => s.visitorCount,
    (s) => s.source,
  );
  const total = folded.reduce((sum, f) => sum + f.count, 0);

  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-lg text-black dark:text-neutral-100">Traffic sources</h3>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          First touch — what originally brought each visitor
        </p>
      </CardHeader>
      <CardBody>
        {total === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No traffic-source data in this range.
          </p>
        ) : (
          <>
            {/* Part-to-whole strip. gap-0.5 is the 2px surface gap that keeps
                adjacent segments from reading as one continuous mark. */}
            <div className="mb-4 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
              {folded.map((row, i) => (
                <span
                  key={row.label}
                  className={`h-full first:rounded-l-full last:rounded-r-full ${
                    row.isOther ? OTHER_FILL : CATEGORICAL_FILL[i % CATEGORICAL_FILL.length]
                  }`}
                  style={{ width: `${(row.count / total) * 100}%` }}
                />
              ))}
            </div>

            <ul className="space-y-2.5">
              {folded.map((row, i) => {
                const pct = Math.round((row.count / total) * 100);
                return (
                  <li key={row.label} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`h-2 w-2 flex-none rounded-full ${
                          row.isOther ? OTHER_FILL : CATEGORICAL_FILL[i % CATEGORICAL_FILL.length]
                        }`}
                      />
                      <span
                        className="truncate capitalize text-neutral-700 dark:text-neutral-300"
                        title={row.label}
                      >
                        {row.label}
                      </span>
                    </span>
                    <span className="flex flex-none items-baseline gap-2">
                      <span className="tabular-nums font-medium text-black dark:text-neutral-100">
                        {row.count.toLocaleString()}
                      </span>
                      <span className="tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
                        {pct}%
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>

            {/*
              "Direct" is a mixed bucket, not a clean finding: it holds
              genuinely-direct arrivals AND any visit whose referrer the
              source stripped. Saying so inline stops it being read as
              evidence of brand strength.
            */}
            {folded.some((f) => f.label === 'Direct') ? (
              <p className="mt-4 border-t border-neutral-100 pt-3 text-2xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                &ldquo;Direct&rdquo; includes visits whose referrer was hidden by the source, not
                only people who typed the address.
              </p>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * New vs returning. Two categories, so a part-to-whole strip plus counts —
 * not a pie, which would be two slices and harder to read than the bar.
 */
export function VisitorSplit({
  newVisitors,
  returningVisitors,
}: {
  newVisitors: number;
  returningVisitors: number;
}) {
  const total = newVisitors + returningVisitors;
  const rows = [
    { label: 'New', count: newVisitors, fill: CATEGORICAL_FILL[0] as string },
    { label: 'Returning', count: returningVisitors, fill: CATEGORICAL_FILL[1] as string },
  ];

  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-lg text-black dark:text-neutral-100">New vs returning</h3>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          Based on each browser&apos;s first-ever visit
        </p>
      </CardHeader>
      <CardBody>
        {total === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No visitors in this range.
          </p>
        ) : (
          <>
            <div className={`mb-4 flex h-2 gap-0.5 overflow-hidden rounded-full ${TRACK}`} aria-hidden="true">
              {rows.map((r) => (
                <span
                  key={r.label}
                  className={`h-full first:rounded-l-full last:rounded-r-full ${r.fill}`}
                  style={{ width: `${(r.count / total) * 100}%` }}
                />
              ))}
            </div>
            <ul className="space-y-2.5">
              {rows.map((r) => (
                <li key={r.label} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 flex-none rounded-full ${r.fill}`} />
                    <span className="text-neutral-700 dark:text-neutral-300">{r.label}</span>
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="tabular-nums font-medium text-black dark:text-neutral-100">
                      {r.count.toLocaleString()}
                    </span>
                    <span className="tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
                      {Math.round((r.count / total) * 100)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardBody>
    </Card>
  );
}
