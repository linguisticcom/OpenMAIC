'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CourseAccessFormProps {
  courseId: string;
  universityId: string;
  cohortId?: string;
  courseTitle: string;
  universityName: string;
  redirectUrl?: string;
  compact?: boolean;
  onSuccess?: () => void;
}

interface AccessResponse {
  success: boolean;
  valid?: boolean;
  message?: string;
  error?: string;
  redirectUrl?: string;
}

export function CourseAccessForm({
  courseId,
  universityId,
  cohortId,
  courseTitle,
  universityName,
  redirectUrl,
  compact,
  onSuccess,
}: CourseAccessFormProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accessCode = code.trim();
    if (!accessCode || isSubmitting) return;

    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/course-access/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          organizationId: universityId,
          cohortId,
          accessCode,
        }),
      });
      const payload = (await response.json()) as AccessResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to validate this access code.');
      }
      if (!payload.valid) {
        setError(payload.message || 'This access code is not valid for the selected course.');
        return;
      }

      setSuccess(true);
      setCode('');
      const nextUrl = redirectUrl || payload.redirectUrl;
      if (nextUrl) {
        router.push(nextUrl);
      } else {
        router.refresh();
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to validate this access code.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-4 shadow-sm',
        compact && 'border-0 p-0 shadow-none',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700">
          <KeyRound className="size-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold tracking-normal text-slate-950">
            Enter access code
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Unlock {courseTitle} for {universityName}.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            if (error) setError(null);
            if (success) setSuccess(false);
          }}
          placeholder="Access code"
          autoComplete="off"
          className="min-h-10 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium tracking-normal text-slate-950 outline-none transition focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
        />
        <Button
          type="submit"
          disabled={!code.trim() || isSubmitting}
          className="min-h-10 bg-violet-700 px-4 text-white hover:bg-violet-800"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <KeyRound className="size-4" />
          )}
          Validate
        </Button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>Access granted. The course is now unlocked.</span>
        </div>
      )}
    </form>
  );
}
