import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Fraunces, DM_Sans } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { NavigationProgress } from '@/components/NavigationProgress';
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
  title: 'NorthQu',
  description: 'Turn anonymous storefront traffic into known leads.',
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
