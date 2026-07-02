import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CourseDetail } from '@/components/course-portal/course-detail';
import { CoursePortalShell } from '@/components/course-portal/portal-shell';
import { PublicAccessForm } from '@/components/tenant-portal/public-access-form';
import { hasCourseAccessOrAccount } from '@/lib/server/course-access';
import { getCourseDetailContext } from '@/lib/server/course-portal-data';

export const dynamic = 'force-dynamic';

export default async function PublicOrganizationCoursePage({
  params,
}: {
  params: Promise<{ organizationSlug: string; courseSlug: string }>;
}) {
  const { organizationSlug, courseSlug } = await params;
  const context = await getCourseDetailContext({
    organizationSlug,
    courseSlug,
  });
  if (!context) notFound();

  const accessGranted = await hasCourseAccessOrAccount({
    courseId: context.course.id,
    universityId: context.organization.id,
    cohortId: context.assignment.cohortId,
  });

  return (
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
        assignment={context.assignment}
        accessGranted={accessGranted}
      />
      {!accessGranted && (
        <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="max-w-md">
            <PublicAccessForm
              organizationSlug={context.organization.slug}
              courseSlug={context.course.slug}
            />
          </div>
        </div>
      )}
    </CoursePortalShell>
  );
}
