import { Card, CardBody, CardHeader } from '../ui/Card';
import { sequentialStep, TRACK } from '@/lib/chartPalette';
import type { FunnelStage } from '@/lib/queries';

/**
 * Ordered stages, widths proportional to the FIRST stage.
 *
 * A horizontal bar per stage rather than the classic tapering-trapezoid
 * funnel: a trapezoid encodes each value as an area, and areas are read
 * far less accurately than a common-baseline length. The trapezoid also
 * implies every visitor flowed strictly top-to-bottom, which the
 * underlying query explicitly does not claim (see get_conversion_funnel
 * in 0009_analytics.sql — it counts who reached each stage at all, not
 * who followed the exact path).
 *
 * Every bar carries its stage name, absolute count, and share as text, so
 * the sequential fill is reinforcement rather than the sole carrier of
 * meaning — which is also what discharges the palette's contrast-relief
 * obligation (see chartPalette.ts).
 */
export function ConversionFunnel({ stages }: { stages: FunnelStage[] }) {
  const hasData = stages.some((s) => s.visitorCount > 0);

  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-lg text-black dark:text-neutral-100">Conversion funnel</h3>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          Distinct visitors who reached each stage
        </p>
      </CardHeader>
      <CardBody>
        {!hasData ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No funnel activity in this range.
          </p>
        ) : (
          <ol className="space-y-3.5">
            {stages.map((stage, i) => (
              <li key={stage.stage}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-neutral-700 dark:text-neutral-300">{stage.stage}</span>
                  <span className="flex items-baseline gap-2">
                    <span className="tabular-nums font-medium text-black dark:text-neutral-100">
                      {stage.visitorCount.toLocaleString()}
                    </span>
                    <span className="tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
                      {stage.pctOfTop}%
                    </span>
                  </span>
                </div>

                <div className={`mt-1.5 h-2 overflow-hidden rounded-full ${TRACK}`}>
                  <div
                    className={`h-full rounded-full ${sequentialStep(i, stages.length)}`}
                    style={{ width: `${stage.pctOfTop}%` }}
                    title={`${stage.stage}: ${stage.visitorCount.toLocaleString()} visitors (${stage.pctOfTop}% of the top of the funnel)`}
                  />
                </div>

                {/*
                  Step-over-step conversion, shown only where it means
                  something. pctOfPrevious is null for the first stage and
                  whenever the previous stage was zero — rendering "100%" or
                  "0%" there would invent a conversion rate from nothing.
                */}
                {stage.pctOfPrevious !== null ? (
                  <p className="mt-1 text-2xs text-neutral-500 dark:text-neutral-400">
                    {stage.pctOfPrevious}% of previous step
                    {stage.pctOfPrevious < 100 ? (
                      <span className="text-brick-700 dark:text-brick-300">
                        {' '}
                        · {100 - stage.pctOfPrevious}% dropped off
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
