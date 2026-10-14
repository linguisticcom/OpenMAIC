'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { Course, CourseStatus } from '@/lib/types/course-portal';

const statusOptions: CourseStatus[] = ['active', 'draft', 'locked', 'completed'];

const accessModeOptions: { value: 'open' | 'code'; label: string }[] = [
  { value: 'open', label: 'Open — playable by link, no code' },
  { value: 'code', label: 'Access code required' },
];

export function GlobalCourseStatusForm({ course }: { course: Course }) {
  const router = useRouter();
  const [status, setStatus] = useState<CourseStatus>(course.status);
  const [accessMode, setAccessMode] = useState<'open' | 'code'>(course.accessMode || 'open');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function patch(body: { status?: CourseStatus; accessMode?: 'open' | 'code' }) {
    setMessage(null);
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to update the course.');
      }
      setMessage('Saved.');
      router.refresh();
    } catch (err) {
      setStatus(course.status);
      setAccessMode(course.accessMode || 'open');
      setError(err instanceof Error ? err.message : 'Unable to update the course.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateStatus(nextStatus: CourseStatus) {
    setStatus(nextStatus);
    if (nextStatus === course.status) return;
    await patch({ status: nextStatus });
  }

  async function updateAccessMode(nextMode: 'open' | 'code') {
    setAccessMode(nextMode);
    if (nextMode === (course.accessMode || 'open')) return;
    await patch({ accessMode: nextMode });
  }

  const selectClass =
    'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100';

  return (
    <div className="mt-5 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
      <label className="grid gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Global status
        <span className="flex items-center gap-2">
          <select
            value={status}
            disabled={isSubmitting}
            onChange={(event) => updateStatus(event.target.value as CourseStatus)}
            className={selectClass}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option.replace('_', ' ')}
              </option>
            ))}
          </select>
          {isSubmitting && <Loader2 className="size-4 animate-spin text-violet-700" />}
        </span>
      </label>

      <label className="grid gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Learner access
        <select
          value={accessMode}
          disabled={isSubmitting}
          onChange={(event) => updateAccessMode(event.target.value as 'open' | 'code')}
          className={selectClass}
        >
          {accessModeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {message && (
        <p className="text-xs font-medium text-emerald-700 sm:col-span-2">{message}</p>
      )}
      {error && <p className="text-xs font-medium text-red-700 sm:col-span-2">{error}</p>}
    </div>
  );
}
