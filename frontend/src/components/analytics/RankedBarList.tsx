import { Card, CardBody, CardHeader } from '../ui/Card';
import { sequentialStep, TRACK } from '@/lib/chartPalette';

export interface RankedRow {
  label: string;
  value: number;
  /** Optional secondary figure, e.g. distinct visitors behind the count. */
  secondary?: { value: number; suffix: string };
}

/**
 * Ranked magnitude, one hue, more-is-darker.
 *
 * Sequential rather than categorical because these rows are the same KIND
 * of thing at different sizes — the reader compares lengths, they don't
 * need to tell "sofa" from "table" by colour. Giving each row its own hue
 * would imply a distinction that isn't there and would blow past the
 * three-slot categorical ceiling on any real list.
 *
 * Shared by Top searches / Top categories, which differ only in wording;
 * two near-identical components would drift apart the first time one got
 * a fix the other didn't.
 */
export function RankedBarList({
  title,
  subtitle,
  rows,
  emptyMessage,
  valueSuffix,
}: {
  title: string;
  subtitle?: string;
  rows: RankedRow[];
  emptyMessage: string;
  /** Unit for the primary number, e.g. "searches". Used in hover text. */
  valueSuffix: string;
}) {
  // Scale to the largest row, not to a total: this answers "how do these
  // compare to each other", and a share-of-total scale would squash every
  // bar into illegibility on a long tail.
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);

  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-lg text-black dark:text-neutral-100">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
        ) : null}
      </CardHeader>
      <CardBody>
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{emptyMessage}</p>
        ) : (
          <ol className="space-y-3">
            {rows.map((row, i) => (
              <li key={`${row.label}-${i}`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  {/* min-w-0 + truncate: long product/search strings must
                      shorten rather than push the number off the card. */}
                  <span className="min-w-0 truncate text-neutral-700 dark:text-neutral-300" title={row.label}>
                    {row.label}
                  </span>
                  <span className="flex flex-none items-baseline gap-2">
                    <span className="tabular-nums font-medium text-black dark:text-neutral-100">
                      {row.value.toLocaleString()}
                    </span>
                    {row.secondary ? (
                      <span className="tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
                        {row.secondary.value.toLocaleString()} {row.secondary.suffix}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${TRACK}`}>
                  <div
                    className={`h-full rounded-full ${sequentialStep(i, rows.length)}`}
                    style={{ width: max === 0 ? '0%' : `${(row.value / max) * 100}%` }}
                    title={`${row.label}: ${row.value.toLocaleString()} ${valueSuffix}`}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
