import Link from 'next/link';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { CourseDirectory } from '@/components/course-portal/course-directory';
import { CoursePortalIntro, CoursePortalShell } from '@/components/course-portal/portal-shell';
import { hasCourseAccessOrAccount } from '@/lib/server/course-access';
import { isCourseOpenAccess } from '@/lib/course-access-mode';
import { listCoursePortalCards, listUniversities } from '@/lib/server/course-portal-data';
import type { CoursePortalCardData, CoursePortalCardView } from '@/lib/types/course-portal';

export const dynamic = 'force-dynamic';

async function withAccessState(cards: CoursePortalCardData[]): Promise<CoursePortalCardView[]> {
  return Promise.all(
    cards.map(async (card) => ({
      ...card,
      accessGranted:
        isCourseOpenAccess(card.course) ||
        (await hasCourseAccessOrAccount({
          courseId: card.course.id,
          universityId: card.university.id,
          cohortId: card.cohortId,
        })),
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
        description="Browse institution-specific AI, cloud, automation, and business courses. Every generated class is also open to explore from the class library."
      />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/classes"
          className="flex flex-col gap-3 rounded-lg border border-violet-200 bg-violet-50 p-5 transition hover:border-violet-300 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-start gap-3">
            <PlayCircle className="mt-0.5 size-5 shrink-0 text-violet-700" />
            <span>
              <span className="block text-sm font-semibold text-violet-900">
                Looking for the full class library?
              </span>
              <span className="mt-1 block text-sm leading-6 text-violet-800">
                Open every class LC Academy has generated and play it directly, with no account and
                no access code.
              </span>
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-md bg-violet-700 px-4 py-2 text-sm font-semibold text-white">
            Browse all classes
            <ArrowRight className="size-4" />
          </span>
        </Link>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <CourseDirectory cards={cardsWithAccess} universities={universities} />
      </div>
    </CoursePortalShell>
  );
}
