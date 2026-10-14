import { isCourseOpenAccess } from '@/lib/course-access-mode';
import { getCoursePortalDataset } from '@/lib/server/course-portal-data';
import type { Course } from '@/lib/types/course-portal';

/**
 * The public "every class LC Academy has generated" surface.
 *
 * Read-only projection over the course dataset: no assignment, organization or
 * cohort is required, because the school-facing library must list classes that
 * were never assigned to a tenant yet.
 */
export interface ClassLibraryEntry {
  course: Course;
  /** Classroom that actually plays for this course, if any. */
  classroomId?: string;
  /** Direct playback URL, when the course has a classroom. */
  playHref?: string;
  sceneCount: number;
  isOpen: boolean;
  /** Institutions this class is assigned to, for context on the card. */
  organizationNames: string[];
}

export interface ClassLibrary {
  entries: ClassLibraryEntry[];
  /** Entries that have a playable classroom. */
  playableCount: number;
  categories: { category: string; count: number }[];
}

function resolveClassroomId(course: Course): string | undefined {
  if (course.classroomId) return course.classroomId;
  const moduleWithClassroom = course.modules.find((module) => module.classroomId);
  return moduleWithClassroom?.classroomId;
}

export function classroomPlayHref(classroomId: string): string {
  return `/classroom/${classroomId}?tts=browser`;
}

export function toClassLibraryEntry(
  course: Course,
  organizationNames: string[] = [],
): ClassLibraryEntry {
  const classroomId = resolveClassroomId(course);
  const entry: ClassLibraryEntry = {
    course,
    sceneCount: course.modules.length,
    isOpen: isCourseOpenAccess(course),
    organizationNames,
  };

  if (classroomId) {
    entry.classroomId = classroomId;
    if (entry.isOpen) entry.playHref = classroomPlayHref(classroomId);
  }

  return entry;
}

function sortEntries(entries: ClassLibraryEntry[]): ClassLibraryEntry[] {
  const statusWeight: Record<string, number> = { active: 0, draft: 1, locked: 2, completed: 3 };
  return [...entries].sort((left, right) => {
    const leftWeight = statusWeight[left.course.status] ?? 9;
    const rightWeight = statusWeight[right.course.status] ?? 9;
    if (leftWeight !== rightWeight) return leftWeight - rightWeight;
    const leftDate = left.course.updatedAt || left.course.createdAt;
    const rightDate = right.course.updatedAt || right.course.createdAt;
    return rightDate.localeCompare(leftDate);
  });
}

export async function listClassLibrary(options?: {
  includeWithoutClassroom?: boolean;
}): Promise<ClassLibrary> {
  const dataset = await getCoursePortalDataset();
  const includeWithoutClassroom = options?.includeWithoutClassroom ?? true;

  const entries = dataset.courses
    .filter((course) => includeWithoutClassroom || Boolean(resolveClassroomId(course)))
    .map((course) =>
      toClassLibraryEntry(
        course,
        dataset.organizations
          .filter((organization) =>
            dataset.assignments.some(
              (assignment) =>
                assignment.courseId === course.id &&
                assignment.organizationId === organization.id,
            ),
          )
          .map((organization) => organization.name),
      ),
    );

  const categories = Array.from(
    entries.reduce((counts, entry) => {
      const category = entry.course.category || 'Uncategorised';
      counts.set(category, (counts.get(category) || 0) + 1);
      return counts;
    }, new Map<string, number>()),
  )
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category));

  return {
    entries: sortEntries(entries),
    playableCount: entries.filter((entry) => Boolean(entry.classroomId)).length,
    categories,
  };
}

export async function getClassLibraryEntry(
  slugOrId: string,
): Promise<ClassLibraryEntry | undefined> {
  const library = await listClassLibrary();
  return library.entries.find(
    (entry) => entry.course.slug === slugOrId || entry.course.id === slugOrId,
  );
}
