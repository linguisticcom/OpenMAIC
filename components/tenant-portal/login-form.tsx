'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/organization-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
        dashboardUrl?: string;
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to sign in.');
      }
      router.push(payload.dashboardUrl || '/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Email
          <input
            value={email}
            type="email"
            autoComplete="email"
            required
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Password
          <input
            value={password}
            type="password"
            autoComplete="current-password"
            required
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          />
        </label>
      </div>
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button
        type="submit"
        disabled={isSubmitting || !email.trim() || !password}
        className="mt-5 min-h-10 w-full bg-violet-700 text-white hover:bg-violet-800"
      >
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
        Sign in
      </Button>
      <div className="mt-4 flex flex-col gap-2 text-center text-sm font-medium text-violet-700 sm:flex-row sm:justify-between">
        <Link href="/forgot-password">Forgot password?</Link>
        <Link href="/signup">Create learner account</Link>
      </div>
    </form>
  );
}
