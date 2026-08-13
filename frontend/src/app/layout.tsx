import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Fraunces, DM_Sans } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { NavigationProgress } from '@/components/NavigationProgress';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600'],
  display: 'swap',
});

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  /* `metadataBase` is what turns every relative OG/canonical URL below
     into an absolute one — without it Next warns at build time and social
     crawlers, which do not resolve relative URLs, silently get nothing. */
  metadataBase: new URL(SITE_URL),
  title: {
    // Every child page sets only its own name; this appends the brand once,
    // centrally, so no page can forget it or format it differently.
    default: 'NorthQu — Technology with direction',
    template: '%s · NorthQu',
  },
  description:
    'NorthQu builds software, AI automation, lead-tracking systems and websites for businesses. LeadPulse, our lead platform, turns anonymous storefront traffic into known, contactable leads.',
  applicationName: 'NorthQu',
  keywords: [
    'lead tracking',
    'visitor identification',
    'ecommerce analytics',
    'AI automation',
    'CRM',
    'WooCommerce lead capture',
    'Shopify lead tracking',
    'software development',
  ],
  authors: [{ name: 'NorthQu' }],
  creator: 'NorthQu',
  openGraph: {
    type: 'website',
    siteName: 'NorthQu',
    title: 'NorthQu — Technology with direction',
    description:
      'Software, AI automation, lead systems and websites for businesses. LeadPulse turns anonymous storefront traffic into known leads.',
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NorthQu — Technology with direction',
    description:
      'Software, AI automation, lead systems and websites for businesses. LeadPulse turns anonymous storefront traffic into known leads.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  /**
   * Lets the page paint into the notch / home-indicator area on modern
   * iPhones, which is what the `.pt-safe` / `.pb-safe` utilities in
   * globals.css then pad back out of. Without `cover`, iOS letterboxes the
   * whole page in the safe area and the site's own background never
   * reaches the screen edges — it reads as a black bar in dark mode.
   *
   * Deliberately NOT setting maximumScale/userScalable: pinch-zoom is an
   * accessibility feature, and disabling it is a WCAG failure. The iOS
   * zoom-on-focus problem is fixed properly in globals.css by making form
   * text 16px, not by taking zoom away from people who need it.
   */
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning is required by next-themes: it writes the
    // theme class onto <html> before React hydrates, which is intentionally
    // a server/client mismatch.
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans">
        {/* useSearchParams() requires a Suspense boundary in the App
            Router — without it, this one component would opt the ENTIRE
            tree out of static rendering. Falls back to nothing while
            resolving, which is correct: there's no navigation in progress
            before hydration anyway. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
