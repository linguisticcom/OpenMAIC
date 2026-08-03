'use client';

import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-950">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
          Dashboard unavailable
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal">
          Tenant data could not be loaded
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The dashboard request failed before the organization data could be rendered.
        </p>
        {error.digest && <p className="mt-3 text-xs text-slate-400">Error digest {error.digest}</p>}
        <Button onClick={reset} className="mt-5 bg-violet-700 text-white hover:bg-violet-800">
          Try again
        </Button>
      </section>
    </main>
  );
}
