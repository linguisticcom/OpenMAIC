'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || isSubmitting) return;
    setError(null);
    setMessage(null);
    setResetUrl(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/organization-auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
        message?: string;
        resetUrl?: string;
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to request a reset link.');
      }
      setMessage(payload.message || 'Check your email for a reset link.');
      setResetUrl(payload.resetUrl || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request a reset link.');
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
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      )}
      {resetUrl && (
        <Link
          href={resetUrl}
          className="mt-3 block rounded-md bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700"
        >
          Open development reset link
        </Link>
      )}
      <Button
        type="submit"
        disabled={isSubmitting || !email.trim()}
        className="mt-5 min-h-10 w-full bg-violet-700 text-white hover:bg-violet-800"
      >
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
        Send reset link
      </Button>
      <Link href="/login" className="mt-4 block text-center text-sm font-medium text-violet-700">
        Back to sign in
      </Link>
    </form>
  );
}
