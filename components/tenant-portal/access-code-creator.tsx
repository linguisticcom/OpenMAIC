'use client';

import { FormEvent, useMemo, useState } from 'react';
import { GraduationCap, Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Cohort, OrganizationCourseSummary, Student } from '@/lib/types/course-portal';

export function AccessCodeCreator({
  organizationId,
  courses,
  cohorts,
  students,
  initialCourseId,
}: {
  organizationId: string;
  courses: OrganizationCourseSummary[];
  cohorts: Cohort[];
  students: Student[];
  initialCourseId?: string;
}) {
  const initialAssignment =
    courses.find((course) => course.course.id === initialCourseId) || courses[0];
  const [assignmentId, setAssignmentId] = useState(initialAssignment?.assignmentId || '');
  const [studentId, setStudentId] = useState('');
  const [maxUses, setMaxUses] = useState('25');
  const [expiresAt, setExpiresAt] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedAssignment = useMemo(
    () => courses.find((course) => course.assignmentId === assignmentId),
    [assignmentId, courses],
  );

  const cohortById = useMemo(
    () => new Map(cohorts.map((cohort) => [cohort.id, cohort])),
    [cohorts],
  );

  const eligibleStudents = useMemo(() => {
    if (!selectedAssignment?.cohortId) return students;
    return students.filter((student) => student.cohortId === selectedAssignment.cohortId);
  }, [selectedAssignment?.cohortId, students]);

  if (courses.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-violet-50 text-violet-700">
          <GraduationCap className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-normal text-slate-950">
          No assignable courses available
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Access codes can only be generated after a platform admin assigns a Linguistic
          Communication Academy course to this organization or teacher scope.
        </p>
      </section>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAssignment || isSubmitting) return;
    setError(null);
    setGeneratedCode(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/organization/access-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          courseId: selectedAssignment.course.id,
          cohortId: selectedAssignment.cohortId,
          studentId: studentId || undefined,
          expiresAt: expiresAt || undefined,
          maxUses: maxUses ? Number(maxUses) : undefined,
        }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
        code?: string;
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to generate access code.');
      }
      setGeneratedCode(payload.code || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate access code.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Course and cohort scope
          <select
            value={assignmentId}
            onChange={(event) => {
              setAssignmentId(event.target.value);
              setStudentId('');
            }}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          >
            {courses.map((course) => (
              <option key={course.assignmentId} value={course.assignmentId}>
                {course.course.title}
                {' - '}
                {course.cohortId
                  ? cohortById.get(course.cohortId)?.name || course.cohortId
                  : 'Organization-wide'}
              </option>
            ))}
          </select>
          {selectedAssignment?.cohortId && (
            <span className="text-xs leading-5 text-slate-500">
              This code will be restricted to{' '}
              {cohortById.get(selectedAssignment.cohortId)?.name || selectedAssignment.cohortId}.
            </span>
          )}
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Student optional
          <select
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          >
            <option value="">Any eligible student</option>
            {eligibleStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
            {eligibleStudents.length === 0 && (
              <option value="" disabled>
                No students in selected cohort
              </option>
            )}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Max uses
          <input
            value={maxUses}
            type="number"
            min="1"
            onChange={(event) => setMaxUses(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Expiration optional
          <input
            value={expiresAt}
            type="datetime-local"
            onChange={(event) => setExpiresAt(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          />
        </label>
      </div>
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {generatedCode && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-sm font-semibold text-emerald-800">Generated access code</p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-wide text-emerald-950">
            {generatedCode}
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            Store it now. The list view only shows metadata, not code secrets.
          </p>
        </div>
      )}
      <Button
        type="submit"
        disabled={!selectedAssignment || isSubmitting}
        className="mt-5 min-h-10 bg-violet-700 text-white hover:bg-violet-800"
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <PlusCircle className="size-4" />
        )}
        Generate access code
      </Button>
    </form>
  );
}
