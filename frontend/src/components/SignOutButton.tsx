'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        // Without the pending state, clicking this did nothing visible for
        // however long auth.signOut()'s network round-trip takes — reads
        // as an unresponsive button, not a fast one.
        setPending(true);
        await createClient().auth.signOut();
        router.push('/login');
        router.refresh();
      }}
      className="text-xs font-medium text-neutral-500 transition-colors hover:text-cinnamon-700 disabled:cursor-wait disabled:opacity-60 dark:text-neutral-400 dark:hover:text-cinnamon-400"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
