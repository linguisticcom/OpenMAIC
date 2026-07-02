'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PublicAccessForm({
  organizationSlug,
  courseSlug,
  courses = [],
}: {
  organizationSlug: string;
  courseSlug?: string;
  courses?: Array<{ slug: string; title: string }>;
}) {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [selectedCourseSlug, setSelectedCourseSlug] = useState(
    courseSlug || courses[0]?.slug || '',
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessCode.trim() || !selectedCourseSlug || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/course-access/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationSlug,
          courseSlug: selectedCourseSlug,
          accessCode,
        }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        valid?: boolean;
        message?: string;
        error?: string;
        redirectUrl?: string;
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to validate access code.');
      }
      if (!payload.valid) {
        setError(payload.message || 'This access code is not valid.');
        return;
      }
      router.push(payload.redirectUrl || `/u/${organizationSlug}/courses`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to validate access code.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      {!courseSlug && (
        <label className="mb-4 grid gap-2 text-sm font-medium text-slate-700">
          Course
          <select
            value={selectedCourseSlug}
            onChange={(event) => setSelectedCourseSlug(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          >
            {courses.map((course) => (
              <option key={course.slug} value={course.slug}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Access code
        <input
          value={accessCode}
          onChange={(event) => {
            setAccessCode(event.target.value);
            if (error) setError(null);
          }}
          className="h-11 rounded-md border border-slate-200 px-3 font-mono text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          placeholder="Enter your code"
          autoComplete="off"
        />
      </label>
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <Button
        type="submit"
        disabled={!accessCode.trim() || !selectedCourseSlug || isSubmitting}
        className="mt-4 min-h-10 w-full bg-violet-700 text-white hover:bg-violet-800"
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <KeyRound className="size-4" />
        )}
        Unlock course
      </Button>
    </form>
  );
}
