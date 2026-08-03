'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ResetPasswordForm({ token }: { token?: string }) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(token ? null : 'Reset token is missing.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !password || isSubmitting) return;
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/organization-auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
        message?: string;
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to reset password.');
      }
      setPassword('');
      setMessage(payload.message || 'Password reset.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        New password
        <input
          value={password}
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          onChange={(event) => setPassword(event.target.value)}
          className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
        />
      </label>
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      )}
      <Button
        type="submit"
        disabled={!token || isSubmitting || password.length < 8}
        className="mt-5 min-h-10 w-full bg-violet-700 text-white hover:bg-violet-800"
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <KeyRound className="size-4" />
        )}
        Reset password
      </Button>
      {message && (
        <Link href="/login" className="mt-4 block text-center text-sm font-medium text-violet-700">
          Sign in
        </Link>
      )}
    </form>
  );
}
