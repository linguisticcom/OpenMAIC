import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CourseDetail } from '@/components/course-portal/course-detail';
import { CoursePortalShell } from '@/components/course-portal/portal-shell';
import { CourseAccessGate } from '@/components/course-portal/course-access-gate';
import { findCourseAccessAssignment } from '@/lib/server/course-access';
import { getCourseDetailContext } from '@/lib/server/course-portal-data';
import { getCurrentPortalSession, isPlatformAdmin } from '@/lib/server/organization-session';

export const dynamic = 'force-dynamic';

export default async function PublicOrganizationCoursePage({
  params,
}: {
  params: Promise<{ organizationSlug: string; courseSlug: string }>;
}) {
  const { organizationSlug, courseSlug } = await params;
  const [context, session] = await Promise.all([
    getCourseDetailContext({ organizationSlug, courseSlug }),
    getCurrentPortalSession(),
  ]);
  if (!context) notFound();

  const accessAssignment = await findCourseAccessAssignment({
    courseId: context.course.id,
    universityId: context.organization.id,
    assignments: context.assignments,
  });
  const assignment = accessAssignment || context.assignment;
  const accessGranted = Boolean(accessAssignment);

  return (
    <CourseAccessGate
      accessGranted={accessGranted}
      courseId={context.course.id}
      universityId={context.organization.id}
      cohortId={assignment.cohortId}
      courseTitle={context.course.title}
      universityName={context.organization.name}
    >
      <CoursePortalShell>
        <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <Link
            href={`/u/${context.organization.slug}/courses`}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-950"
          >
            <ArrowLeft className="size-4" />
            Back to {context.organization.name}
          </Link>
        </div>
        <CourseDetail
          course={context.course}
          university={context.organization}
          assignment={assignment}
          accessGranted={accessGranted}
          adminPreview={Boolean(session && isPlatformAdmin(session.user))}
        />
      </CoursePortalShell>
    </CourseAccessGate>
  );
}
