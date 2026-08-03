'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { Course, CourseStatus } from '@/lib/types/course-portal';

const statusOptions: CourseStatus[] = ['active', 'draft', 'locked', 'completed'];

export function GlobalCourseStatusForm({ course }: { course: Course }) {
  const router = useRouter();
  const [status, setStatus] = useState<CourseStatus>(course.status);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function updateStatus(nextStatus: CourseStatus) {
    setStatus(nextStatus);
    setMessage(null);
    setError(null);

    if (nextStatus === course.status) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to update course status.');
      }
      setMessage('Status updated.');
      router.refresh();
    } catch (err) {
      setStatus(course.status);
      setError(err instanceof Error ? err.message : 'Unable to update course status.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3">
      <label className="grid gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Global status
        <span className="flex items-center gap-2">
          <select
            value={status}
            disabled={isSubmitting}
            onChange={(event) => updateStatus(event.target.value as CourseStatus)}
            className="h-10 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
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
      {message && <p className="mt-2 text-xs font-medium text-emerald-700">{message}</p>}
      {error && <p className="mt-2 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}
