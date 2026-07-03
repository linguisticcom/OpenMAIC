import { describe, expect, it } from 'vitest';
import { createCourseAccessToken, verifyCourseAccessToken } from '@/lib/server/course-access';

describe('course access tokens', () => {
  it('preserves learner context for access-code activity tracking', () => {
    const { token } = createCourseAccessToken({
      courseId: 'course-cloud-devsecops',
      universityId: 'org-esilv',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      codeId: 'code-esilv-cloud',
      studentId: 'student-esilv-1',
      enrollmentId: 'enroll-esilv-cloud-amina',
    });

    const payload = verifyCourseAccessToken(token, {
      courseId: 'course-cloud-devsecops',
      universityId: 'org-esilv',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
    });

    expect(payload).toMatchObject({
      courseId: 'course-cloud-devsecops',
      universityId: 'org-esilv',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      codeId: 'code-esilv-cloud',
      studentId: 'student-esilv-1',
      enrollmentId: 'enroll-esilv-cloud-amina',
    });
  });
});
