import { notFound } from 'next/navigation';
import { CourseDirectory } from '@/components/course-portal/course-directory';
import { CoursePortalShell } from '@/components/course-portal/portal-shell';
import { UniversityHeader } from '@/components/course-portal/university-header';
import { hasCourseAccessOrAccount } from '@/lib/server/course-access';
import {
  getOrganizationBySlug,
  listCoursePortalCards,
  listOrganizations,
} from '@/lib/server/course-portal-data';
import type { CoursePortalCardData, CoursePortalCardView } from '@/lib/types/course-portal';

export const dynamic = 'force-dynamic';

async function withAccessState(cards: CoursePortalCardData[]): Promise<CoursePortalCardView[]> {
  return Promise.all(
    cards.map(async (card) => ({
      ...card,
      accessGranted: await hasCourseAccessOrAccount({
        courseId: card.course.id,
        universityId: card.university.id,
        cohortId: card.cohortId,
      }),
    })),
  );
}

export default async function PublicOrganizationCoursesPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  const organization = await getOrganizationBySlug(organizationSlug);
  if (!organization) notFound();

  const [cards, organizations] = await Promise.all([
    listCoursePortalCards({ organizationId: organization.id }),
    listOrganizations(),
  ]);

  return (
    <CoursePortalShell>
      <UniversityHeader university={organization} />
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <CourseDirectory
          cards={await withAccessState(cards)}
          universities={organizations}
          fixedUniversityId={organization.id}
        />
      </div>
    </CoursePortalShell>
  );
}
