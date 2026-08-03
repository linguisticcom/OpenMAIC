'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Cohort, Course, Organization } from '@/lib/types/course-portal';

type TeacherManagerOption = {
  id: string;
  organizationId?: string;
  name: string;
  email: string;
};

export function CourseAssignmentForm({
  organizations,
  courses,
  cohorts,
  teacherManagers,
}: {
  organizations: Organization[];
  courses: Course[];
  cohorts: Cohort[];
  teacherManagers: TeacherManagerOption[];
}) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id || '');
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [cohortId, setCohortId] = useState('');
  const [teacherUserId, setTeacherUserId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const organizationCohorts = useMemo(
    () => cohorts.filter((cohort) => cohort.organizationId === organizationId),
    [cohorts, organizationId],
  );
  const organizationTeacherManagers = useMemo(
    () => teacherManagers.filter((teacher) => teacher.organizationId === organizationId),
    [organizationId, teacherManagers],
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
          teacherUserId: teacherUserId || undefined,
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
      <div className="grid min-w-0 gap-4 lg:grid-cols-4">
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Organization
          <select
            value={organizationId}
            onChange={(event) => {
              setOrganizationId(event.target.value);
              setCohortId('');
              setTeacherUserId('');
            }}
            className="h-11 min-w-0 w-full max-w-full rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Course
          <select
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="h-11 min-w-0 w-full max-w-full rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Cohort optional
          <select
            value={cohortId}
            onChange={(event) => setCohortId(event.target.value)}
            className="h-11 min-w-0 w-full max-w-full rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          >
            <option value="">All students</option>
            {organizationCohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Teacher optional
          <select
            value={teacherUserId}
            onChange={(event) => setTeacherUserId(event.target.value)}
            className="h-11 min-w-0 w-full max-w-full rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          >
            <option value="">No assigned teacher</option>
            {organizationTeacherManagers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name} - {teacher.email}
              </option>
            ))}
          </select>
          {organizationTeacherManagers.length === 0 && (
            <span className="text-xs leading-5 text-slate-500">
              This organization has no teacher-manager accounts yet.
            </span>
          )}
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
