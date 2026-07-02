import { Building2, Clock3, LockKeyhole, ShieldCheck } from 'lucide-react';
import { CourseAccessForm } from '@/components/course-portal/course-access-form';
import { CourseStartButton } from '@/components/course-portal/course-start-button';
import type { Course, CourseAssignment, University } from '@/lib/types/course-portal';

function formatDuration(minutes?: number) {
  if (!minutes) return 'Duration pending';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins} min`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function CourseDetail({
  course,
  university,
  assignment,
  accessGranted,
}: {
  course: Course;
  university: University;
  assignment: CourseAssignment;
  accessGranted: boolean;
}) {
  const startHref = course.classroomId ? `/classroom/${course.classroomId}` : '#modules';

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
      <article className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700">
            {course.category}
          </span>
          {course.level && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {course.level}
            </span>
          )}
          <span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-semibold capitalize text-white">
            {course.status}
          </span>
        </div>

        <h1 className="mt-5 text-4xl font-semibold tracking-normal text-slate-950 md:text-5xl">
          {course.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{course.description}</p>

        <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-3">
            <Building2 className="mb-2 size-4 text-violet-700" />
            <p className="font-semibold text-slate-950">{university.name}</p>
            <p>Assigned institution</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <Clock3 className="mb-2 size-4 text-violet-700" />
            <p className="font-semibold text-slate-950">
              {formatDuration(course.estimatedDurationMinutes)}
            </p>
            <p>Estimated duration</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            {accessGranted ? (
              <ShieldCheck className="mb-2 size-4 text-emerald-700" />
            ) : (
              <LockKeyhole className="mb-2 size-4 text-slate-700" />
            )}
            <p className="font-semibold text-slate-950">
              {accessGranted ? 'Unlocked' : 'Preview only'}
            </p>
            <p>Access status</p>
          </div>
        </div>

        <div id="modules" className="mt-8">
          <h2 className="text-2xl font-semibold tracking-normal text-slate-950">Modules</h2>
          <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {course.modules.map((module, index) => (
              <div
                key={module.id}
                className="grid gap-3 p-4 sm:grid-cols-[44px_1fr_110px] sm:items-start"
              >
                <div className="flex size-10 items-center justify-center rounded-md bg-violet-50 text-sm font-semibold text-violet-700">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-normal text-slate-950">
                    {module.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{module.description}</p>
                </div>
                <div className="text-sm font-medium text-slate-500">
                  {module.durationMinutes} min
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>

      <aside className="space-y-4">
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold tracking-normal text-slate-950">Course access</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Access is checked server-side against the course, university, and cohort assignment.
          </p>
          {accessGranted ? (
            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                <span>
                  Your account or access code has unlocked this course for {university.name}.
                </span>
              </div>
              <CourseStartButton
                href={startHref}
                organizationId={university.id}
                courseId={course.id}
              />
            </div>
          ) : (
            <div className="mt-5">
              <CourseAccessForm
                compact
                courseId={course.id}
                universityId={university.id}
                cohortId={assignment.cohortId}
                courseTitle={course.title}
                universityName={university.name}
              />
            </div>
          )}
        </div>
      </aside>
    </section>
  );
}
