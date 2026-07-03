import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CourseDetail } from '@/components/course-portal/course-detail';
import { CoursePortalShell } from '@/components/course-portal/portal-shell';
import { findCourseAccessAssignment } from '@/lib/server/course-access';
import { getCourseDetailContext } from '@/lib/server/course-portal-data';

export const dynamic = 'force-dynamic';

interface CoursePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ university?: string | string[] }>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const context = await getCourseDetailContext({
    courseSlug: slug,
    universitySlug: firstValue(query.university),
  });
  if (!context) notFound();

  const { course, university } = context;
  const universityAssignments = context.assignments.filter(
    (assignment) => assignment.organizationId === university.id,
  );
  const accessAssignment = await findCourseAccessAssignment({
    courseId: course.id,
    universityId: university.id,
    assignments: universityAssignments,
  });
  const assignment = accessAssignment || context.assignment;

  return (
    <CoursePortalShell>
      <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <Link
          href={`/universities/${university.slug}`}
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-950"
        >
          <ArrowLeft className="size-4" />
          Back to {university.name}
        </Link>
      </div>
      <CourseDetail
        course={course}
        university={university}
        assignment={assignment}
        accessGranted={Boolean(accessAssignment)}
      />
    </CoursePortalShell>
  );
}
