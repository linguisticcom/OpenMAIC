import { CourseDirectory } from '@/components/course-portal/course-directory';
import { CoursePortalIntro, CoursePortalShell } from '@/components/course-portal/portal-shell';
import { hasCourseAccessOrAccount } from '@/lib/server/course-access';
import { listCoursePortalCards, listUniversities } from '@/lib/server/course-portal-data';
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

export default async function CoursesPage() {
  const [cards, universities] = await Promise.all([listCoursePortalCards(), listUniversities()]);
  const cardsWithAccess = await withAccessState(cards);

  return (
    <CoursePortalShell>
      <CoursePortalIntro
        title="Linguistic Communication Academy university courses"
        description="Browse institution-specific AI, cloud, automation, and business courses. Restricted courses stay in preview mode until a matching university access code is validated."
      />
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <CourseDirectory cards={cardsWithAccess} universities={universities} />
      </div>
    </CoursePortalShell>
  );
}
