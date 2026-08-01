import { Card, CardBody, CardHeader } from '../ui/Card';
import { sequentialStep, TRACK } from '@/lib/chartPalette';
import type { TopProduct } from '@/lib/queries';

/**
 * Table + bar, not a grouped bar chart.
 *
 * Views, cart-adds and purchases live on wildly different scales — a
 * product with 400 views and 3 purchases is normal. Plotted as grouped
 * bars on one axis the purchase bar is invisible; the usual "fix" for that
 * is a second y-axis, which is the single worst thing you can do to a
 * chart. So: one bar encoding views (the only series worth comparing
 * visually across rows), and the other two as tabular numbers, which are
 * read exactly at any magnitude.
 *
 * The stall badge is the point of the whole widget: heavily-viewed
 * products with zero purchases are the actionable finding here, and an
 * average or a single blended "popularity" score would hide precisely
 * that.
 */
export function TopProducts({ products }: { products: TopProduct[] }) {
  const maxViews = products.reduce((m, p) => Math.max(m, p.viewCount), 0);

  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-lg text-black dark:text-neutral-100">Products</h3>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          Views, cart-adds and purchases per product
        </p>
      </CardHeader>
      <CardBody>
        {products.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No product activity in this range. Product tracking needs the storefront snippet
            installed on product pages.
          </p>
        ) : (
          // Own scroll container so long product names never make the page
          // itself scroll sideways.
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[30rem] text-sm">
              <thead>
                <tr className="text-2xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  <th className="pb-2 text-left font-medium">Product</th>
                  <th className="pb-2 pl-3 text-right font-medium">Views</th>
                  <th className="pb-2 pl-3 text-right font-medium">Cart</th>
                  <th className="pb-2 pl-3 text-right font-medium">Bought</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  // "Looked at a lot, never bought." Thresholded rather than
                  // shown for any zero-purchase row: with 2 views and 0
                  // purchases there is no signal, just a small sample.
                  const stalled = p.purchaseCount === 0 && p.viewCount >= 5;

                  return (
                    <tr
                      key={`${p.name}-${i}`}
                      className="border-t border-neutral-100 align-top dark:border-neutral-800"
                    >
                      <td className="max-w-0 py-2.5 pr-3">
                        <span
                          className="block truncate text-neutral-700 dark:text-neutral-300"
                          title={p.name}
                        >
                          {p.name}
                        </span>
                        <span
                          className={`mt-1 block h-1.5 overflow-hidden rounded-full ${TRACK}`}
                          aria-hidden="true"
                        >
                          <span
                            className={`block h-full rounded-full ${sequentialStep(i, products.length)}`}
                            style={{
                              width: maxViews === 0 ? '0%' : `${(p.viewCount / maxViews) * 100}%`,
                            }}
                          />
                        </span>
                        {stalled ? (
                          <span className="mt-1 inline-block text-2xs text-amber-700 dark:text-amber-300">
                            Viewed {p.viewCount}× · never bought
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5 pl-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                        {p.viewCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 pl-3 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                        {p.cartCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 pl-3 text-right tabular-nums font-medium text-black dark:text-neutral-100">
                        {p.purchaseCount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
