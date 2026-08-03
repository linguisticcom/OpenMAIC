'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { KeyRound, Loader2, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type SignupCourseOption = {
  organizationSlug: string;
  organizationName: string;
  courseSlug: string;
  courseTitle: string;
};

export function SignupForm({
  courses,
  organizationSlug,
}: {
  courses: SignupCourseOption[];
  organizationSlug?: string;
}) {
  const router = useRouter();
  const organizationCourses = useMemo(
    () =>
      organizationSlug
        ? courses.filter((course) => course.organizationSlug === organizationSlug)
        : courses,
    [courses, organizationSlug],
  );
  const [selectedOrganizationSlug, setSelectedOrganizationSlug] = useState(
    organizationSlug || organizationCourses[0]?.organizationSlug || '',
  );
  const selectedOrganizationCourses = organizationCourses.filter(
    (course) => course.organizationSlug === selectedOrganizationSlug,
  );
  const [courseSlug, setCourseSlug] = useState(selectedOrganizationCourses[0]?.courseSlug || '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/organization-auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          accessCode,
          organizationSlug: selectedOrganizationSlug,
          courseSlug,
        }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
        dashboardUrl?: string;
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to create account.');
      }
      router.push(payload.dashboardUrl || '/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (organizationCourses.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-violet-50 text-violet-700">
          <KeyRound className="size-6" />
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          No assigned courses are available for learner signup yet.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-violet-700">
          Back to sign in
        </Link>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4">
        {!organizationSlug && (
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Organization
            <select
              value={selectedOrganizationSlug}
              onChange={(event) => {
                const nextOrganizationSlug = event.target.value;
                setSelectedOrganizationSlug(nextOrganizationSlug);
                const nextCourse = organizationCourses.find(
                  (course) => course.organizationSlug === nextOrganizationSlug,
                );
                setCourseSlug(nextCourse?.courseSlug || '');
              }}
              className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            >
              {[
                ...new Map(
                  organizationCourses.map((course) => [course.organizationSlug, course]),
                ).values(),
              ].map((course) => (
                <option key={course.organizationSlug} value={course.organizationSlug}>
                  {course.organizationName}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Course
          <select
            value={courseSlug}
            onChange={(event) => setCourseSlug(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          >
            {selectedOrganizationCourses.map((course) => (
              <option
                key={`${course.organizationSlug}-${course.courseSlug}`}
                value={course.courseSlug}
              >
                {course.courseTitle}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Name
          <input
            value={name}
            required
            autoComplete="name"
            onChange={(event) => setName(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Email
          <input
            value={email}
            type="email"
            required
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Password
          <input
            value={password}
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Access code
          <input
            value={accessCode}
            required
            autoComplete="off"
            onChange={(event) => setAccessCode(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 font-mono text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          />
        </label>
      </div>
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button
        type="submit"
        disabled={
          isSubmitting ||
          !name.trim() ||
          !email.trim() ||
          password.length < 8 ||
          !accessCode.trim() ||
          !selectedOrganizationSlug ||
          !courseSlug
        }
        className="mt-5 min-h-10 w-full bg-violet-700 text-white hover:bg-violet-800"
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <UserPlus className="size-4" />
        )}
        Create learner account
      </Button>
      <Link href="/login" className="mt-4 block text-center text-sm font-medium text-violet-700">
        Back to sign in
      </Link>
    </form>
  );
}
