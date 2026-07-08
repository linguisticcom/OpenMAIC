import Link from 'next/link';
import { GlobalCourseStatusForm } from '@/components/tenant-portal/global-course-status-form';
import { PageHeader, TenantShell } from '@/components/tenant-portal/tenant-shell';
import { Button } from '@/components/ui/button';
import { getCoursePortalDataset } from '@/lib/server/course-portal-data';
import { requirePlatformPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function AdminCoursesPage() {
  const session = await requirePlatformPageSession();
  const dataset = await getCoursePortalDataset();
  const courses = [...dataset.courses].sort((a, b) =>
    (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt),
  );

  return (
    <TenantShell user={session.user} admin>
      <PageHeader
        label="Global courses"
        title="Linguistic Communication Academy courses"
        description="Academy courses can be assigned to one or more organizations."
        action={
          <Button asChild className="bg-violet-700 text-white hover:bg-violet-800">
            <Link href="/course-studio">Course Studio</Link>
          </Button>
        }
      />
      <div className="grid gap-4 p-5 sm:p-8 lg:grid-cols-2">
        {courses.map((course) => {
          const assignedOrganizations = dataset.assignments.filter(
            (assignment) => assignment.courseId === course.id,
          );
          const generatedClassroomCount =
            (course.classroomId ? 1 : 0) +
            course.modules.filter((module) => Boolean(module.classroomId)).length;
          return (
            <article
              key={course.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-semibold text-violet-700">{course.category}</p>
              <h2 className="mt-2 text-xl font-semibold tracking-normal">{course.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{course.description}</p>
              <p className="mt-4 text-sm text-slate-500">
                Assigned to {assignedOrganizations.length} organization
                {assignedOrganizations.length === 1 ? '' : 's'}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Current status:{' '}
                <span className="font-semibold capitalize text-slate-700">{course.status}</span>
              </p>
              {generatedClassroomCount > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {course.classroomId && (
                    <Link
                      href={`/classroom/${course.classroomId}?tts=browser`}
                      className="rounded-full border border-violet-200 px-3 py-1 font-semibold text-violet-700 hover:bg-violet-50"
                    >
                      Open generated classroom
                    </Link>
                  )}
                  {course.modules
                    .filter((module) => Boolean(module.classroomId))
                    .map((module) => (
                      <Link
                        key={module.id}
                        href={`/classroom/${module.classroomId}?tts=browser`}
                        className="rounded-full border border-violet-200 px-3 py-1 font-semibold text-violet-700 hover:bg-violet-50"
                      >
                        Open {module.title}
                      </Link>
                    ))}
                </div>
              )}
              <GlobalCourseStatusForm course={course} />
            </article>
          );
        })}
      </div>
    </TenantShell>
  );
}
