import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { LogoLockup } from '@/components/Logo';
import { REAUTH_REASON_PARAM, REAUTH_REASON_VALUE } from '@/lib/session';

/**
 * `searchParams.reason === 'session-expired'` arrives from middleware.ts's
 * absolute re-authentication ceiling (lib/session.ts) — a forced sign-out
 * distinct from "never logged in," so it gets its own explanation rather
 * than a bare form that looks like the app just forgot who you were.
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sessionExpired = searchParams[REAUTH_REASON_PARAM] === REAUTH_REASON_VALUE;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see who's been on your storefront."
      notice={
        sessionExpired
          ? 'Your session expired for your security — please sign in again.'
          : null
      }
      footer={
        <>
          No account?{' '}
          <Link href="/signup" className="font-medium text-cinnamon-700 hover:underline dark:text-cinnamon-400">
            Create one
          </Link>
        </>
      }
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
  footer,
  notice,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  notice?: string | null;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          {/* `?home=1` bypasses "/"'s own auth-redirect (getViewer() sends a
              signed-in visitor straight to /dashboard or /super-admin) — see
              (marketing)/page.tsx. Without it, clicking the logo while
              already authenticated would just bounce right back into the
              app instead of showing the actual public homepage. */}
          <Link href="/?home=1" aria-label="NorthQu home">
            <LogoLockup className="h-8" />
          </Link>
        </div>
        <h1 className="font-display text-3xl text-black dark:text-white">{title}</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p>
        {notice ? (
          <p className="mt-4 rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {notice}
          </p>
        ) : null}
        <div className="mt-7">{children}</div>
        <p className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-400">{footer}</p>
      </div>
    </div>
  );
}
