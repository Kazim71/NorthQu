import Link from 'next/link';
import { LogoLockup } from '@/components/Logo';

/**
 * Every link here goes to a route that genuinely exists. Background is
 * explicit `bg-black` — UNCONDITIONALLY, no `dark:` pairing, in EITHER
 * theme. The footer is the one surface that stays black regardless of the
 * page's own light/dark state (which is white vs black elsewhere).
 * `marketing.text`/`textDim`/`textFaint`/`border` below still read well on
 * black — they were tuned to be light values on a dark surface — so
 * they're kept as-is. `forceVariant="dark"` on the lockup pins the
 * white-art logo variant: the footer is always dark, so it always needs
 * the light-on-dark logo regardless of the page theme.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-marketing-border/80 bg-black">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <LogoLockup className="h-7" forceVariant="dark" />
            <p className="mt-4 max-w-xs text-sm text-marketing-textDim">Technology with direction.</p>
            <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/services" className="text-sm text-marketing-textDim hover:text-marketing-text">
                Services
              </Link>
              <Link href="/#work" className="text-sm text-marketing-textDim hover:text-marketing-text">
                Work
              </Link>
              <Link href="/about" className="text-sm text-marketing-textDim hover:text-marketing-text">
                About
              </Link>
              <Link href="/contact" className="text-sm text-marketing-textDim hover:text-marketing-text">
                Contact
              </Link>
            </nav>
          </div>

          <div>
            <p className="text-2xs font-medium uppercase tracking-wider text-marketing-textFaint">
              Services
            </p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/services#software" className="text-sm text-marketing-textDim hover:text-marketing-text">
                  Software Solutions
                </Link>
              </li>
              <li>
                <Link
                  href="/services#ai-automation"
                  className="text-sm text-marketing-textDim hover:text-marketing-text"
                >
                  AI &amp; Automation
                </Link>
              </li>
              <li>
                <Link href="/services#websites" className="text-sm text-marketing-textDim hover:text-marketing-text">
                  Websites &amp; Digital Experiences
                </Link>
              </li>
              <li>
                <Link href="/services/leadpulse" className="text-sm text-marketing-textDim hover:text-marketing-text">
                  Lead &amp; CRM Systems (LeadPulse)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-2xs font-medium uppercase tracking-wider text-marketing-textFaint">
              Company
            </p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/insights" className="text-sm text-marketing-textDim hover:text-marketing-text">
                  Insights
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-marketing-textDim hover:text-marketing-text">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-marketing-textDim hover:text-marketing-text">
                  Log in
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-marketing-border/60 pt-6">
          <p className="text-xs text-marketing-textFaint">© {new Date().getFullYear()} NorthQu</p>
        </div>
      </div>
    </footer>
  );
}
