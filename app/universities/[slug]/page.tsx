import { notFound } from 'next/navigation';
import { CourseDirectory } from '@/components/course-portal/course-directory';
import { CoursePortalShell } from '@/components/course-portal/portal-shell';
import { UniversityHeader } from '@/components/course-portal/university-header';
import { hasCourseAccessOrAccount } from '@/lib/server/course-access';
import {
  getUniversityBySlug,
  listCoursePortalCards,
  listUniversities,
} from '@/lib/server/course-portal-data';
import type { CoursePortalCardData, CoursePortalCardView } from '@/lib/types/course-portal';

export const dynamic = 'force-dynamic';

interface UniversityPageProps {
  params: Promise<{ slug: string }>;
}

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

export default async function UniversityPage({ params }: UniversityPageProps) {
  const { slug } = await params;
  const university = await getUniversityBySlug(slug);
  if (!university) notFound();

  const [cards, universities] = await Promise.all([
    listCoursePortalCards({ universityId: university.id }),
    listUniversities(),
  ]);
  const cardsWithAccess = await withAccessState(cards);

  return (
    <CoursePortalShell>
      <UniversityHeader university={university} />
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <CourseDirectory
          cards={cardsWithAccess}
          universities={universities}
          fixedUniversityId={university.id}
        />
      </div>
    </CoursePortalShell>
  );
}
