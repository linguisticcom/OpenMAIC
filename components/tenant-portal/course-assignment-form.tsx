'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Cohort, Course, Organization } from '@/lib/types/course-portal';

export function CourseAssignmentForm({
  organizations,
  courses,
  cohorts,
}: {
  organizations: Organization[];
  courses: Course[];
  cohorts: Cohort[];
}) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id || '');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [cohortId, setCohortId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const organizationCohorts = useMemo(
    () => cohorts.filter((cohort) => cohort.organizationId === organizationId),
    [cohorts, organizationId],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !courseId || isSubmitting) return;
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/course-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          courseId,
          cohortId: cohortId || undefined,
        }),
      });
      const payload = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to assign course.');
      }
      setMessage('Course assignment saved.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to assign course.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Organization
          <select
            value={organizationId}
            onChange={(event) => {
              setOrganizationId(event.target.value);
              setCohortId('');
            }}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Course
          <select
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Cohort optional
          <select
            value={cohortId}
            onChange={(event) => setCohortId(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          >
            <option value="">All students</option>
            {organizationCohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message && (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button
        type="submit"
        disabled={!organizationId || !courseId || isSubmitting}
        className="mt-5 bg-violet-700 text-white hover:bg-violet-800"
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <PlusCircle className="size-4" />
        )}
        Assign course
      </Button>
    </form>
  );
}
