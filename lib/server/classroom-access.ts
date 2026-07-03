import { hasCourseAccess } from '@/lib/server/course-access';
import {
  getClassroomCourseAccessContext,
  getVisibleOrganizationCourseDetail,
} from '@/lib/server/course-portal-data';
import { canAccessOrganization, getCurrentPortalSession } from '@/lib/server/organization-session';

export async function canReadClassroom(classroomId: string): Promise<boolean> {
  const context = await getClassroomCourseAccessContext(classroomId);
  if (!context || context.assignments.length === 0) return true;

  const session = await getCurrentPortalSession();
  if (session) {
    for (const assignment of context.assignments) {
      if (!canAccessOrganization(session.user, assignment.organizationId)) continue;
      const detail = await getVisibleOrganizationCourseDetail(
        session.user,
        assignment.organizationId,
        context.course.id,
      );
      if (detail) return true;
    }
  }

  for (const assignment of context.assignments) {
    if (
      await hasCourseAccess({
        courseId: context.course.id,
        universityId: assignment.organizationId,
        cohortId: assignment.cohortId,
      })
    ) {
      return true;
    }
  }

  return false;
}
