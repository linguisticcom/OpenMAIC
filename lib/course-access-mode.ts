import type { Course } from '@/lib/types/course-portal';

/**
 * LC Academy default: a course is explorable by anyone with the link unless it
 * was explicitly put behind an institution access code.
 *
 * Single source of truth for that rule — the classroom reader, the classroom
 * API, the course detail page, and the catalogs all call this instead of
 * re-deriving it from status/assignments (the old rule that left every
 * generated class unreachable until an admin assigned it to a university).
 */
export function isCourseOpenAccess(course: Pick<Course, 'accessMode'>): boolean {
  return course.accessMode !== 'code';
}
