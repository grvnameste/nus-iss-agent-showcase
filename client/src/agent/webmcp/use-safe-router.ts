'use client';

import { useRouter } from 'next/navigation';

/** Minimal router surface the agent layer needs: just a push. */
export interface SafePush {
  push: (href: string) => void;
}

/**
 * `useRouter()` from `next/navigation` throws synchronously when it is called
 * outside an App Router context (e.g. isolated unit tests, or any non-router
 * render). The agent layer is purely additive and must never crash the shell,
 * so this hook returns a no-op push when no router is mounted instead of throwing
 * (graceful fallback, Spec 11 FR-1106).
 *
 * Hooks cannot be called conditionally, so we call `useRouter` unconditionally
 * inside a try/catch. The try/catch here guards a hook that itself only *reads*
 * context and throws on absence — it does not conditionally skip a hook.
 */
export function useSafeRouter(): SafePush {
  try {
    const router = useRouter();
    return { push: (href: string) => router.push(href) };
  } catch {
    // No App Router context available — navigation degrades to a no-op.
    return { push: () => {} };
  }
}
