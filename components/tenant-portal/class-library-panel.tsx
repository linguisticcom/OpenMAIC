import Link from 'next/link';
import { ArrowRight, PlayCircle } from 'lucide-react';
import type { ClassLibraryCard } from '@/components/course-portal/class-library';
import { cn } from '@/lib/utils';

/**
 * Compact "every class in the academy" strip used by the dashboards.
 *
 * The dashboards lead with the class library because exploring generated
 * classes is the primary job to be done; access codes, cohorts and activity
 * logs are secondary administration kept further down the page.
 */
export function ClassLibraryPanel({
  cards,
  limit = 9,
  browseHref = '/classes',
  title = 'Academy class library',
  description = 'Every class generated for Linguistic Communication Academy, playable as-is.',
}: {
  cards: ClassLibraryCard[];
  limit?: number;
  browseHref?: string;
  title?: string;
  description?: string;
}) {
  const visible = cards.slice(0, limit);
  const playable = cards.filter((card) => Boolean(card.playHref)).length;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-normal">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
            {playable} of {cards.length} classes playable without an access code
          </p>
        </div>
        <Link
          href={browseHref}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md bg-violet-700 px-4 text-sm font-semibold text-white transition hover:bg-violet-800"
        >
          Browse all {cards.length} classes
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {visible.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((card) => (
            <article
              key={card.slug}
              className="flex h-full flex-col justify-between rounded-lg border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/40"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                  {card.category}
                </p>
                <h3 className="mt-2 text-base font-semibold leading-snug tracking-normal text-slate-950">
                  {card.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                  {card.description}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-500">
                  {card.sceneCount > 0 ? `${card.sceneCount} scenes` : 'In preparation'}
                </span>
                {card.playHref ? (
                  <Link
                    href={card.playHref}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <PlayCircle className="size-4" />
                    Open
                  </Link>
                ) : (
                  <Link
                    href={card.detailHref}
                    className={cn(
                      'inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-600',
                    )}
                  >
                    Details
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-slate-500">
          No classes have been generated yet. Generate one from the platform admin area and it will
          appear here immediately.
        </p>
      )}

      {cards.length > visible.length && (
        <p className="mt-4 text-sm text-slate-500">
          Showing {visible.length} of {cards.length}.{' '}
          <Link href={browseHref} className="font-semibold text-violet-700">
            See the rest
          </Link>
          .
        </p>
      )}
    </section>
  );
}

/**
 * Maps class-library entries to the card shape shared with the public library.
 * Kept here so every dashboard renders the library identically.
 */
export function classLibraryToCards(
  entries: {
    course: {
      slug: string;
      title: string;
      description: string;
      category: string;
      status: ClassLibraryCard['status'];
      level?: string;
      coverTone?: ClassLibraryCard['coverTone'];
      coverAsset?: string;
      estimatedDurationMinutes?: number;
    };
    sceneCount: number;
    playHref?: string;
    isOpen: boolean;
    organizationNames: string[];
  }[],
): ClassLibraryCard[] {
  return entries.map((entry) => ({
    slug: entry.course.slug,
    title: entry.course.title,
    description: entry.course.description,
    category: entry.course.category || 'Linguistic Communication Academy',
    status: entry.course.status,
    level: entry.course.level,
    sceneCount: entry.sceneCount,
    durationMinutes: entry.course.estimatedDurationMinutes,
    coverTone: entry.course.coverTone,
    coverAsset: entry.course.coverAsset,
    playHref: entry.playHref,
    detailHref: `/classes/${entry.course.slug}`,
    organizationNames: entry.organizationNames,
    requiresCode: !entry.isOpen,
  }));
}
