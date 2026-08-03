import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCourseAccessToken, verifyCourseAccessToken } from '@/lib/server/course-access';

const originalCourseAccessSecret = process.env.COURSE_ACCESS_SECRET;
const originalAccessCode = process.env.ACCESS_CODE;

function clearCourseAccessSecrets() {
  delete process.env.COURSE_ACCESS_SECRET;
  delete process.env.ACCESS_CODE;
}

describe('course access tokens', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalCourseAccessSecret === undefined) {
      delete process.env.COURSE_ACCESS_SECRET;
    } else {
      process.env.COURSE_ACCESS_SECRET = originalCourseAccessSecret;
    }
    if (originalAccessCode === undefined) {
      delete process.env.ACCESS_CODE;
    } else {
      process.env.ACCESS_CODE = originalAccessCode;
    }
  });

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

  it('requires a real signing secret before issuing production access tokens', () => {
    vi.stubEnv('NODE_ENV', 'production');
    clearCourseAccessSecrets();

    expect(() =>
      createCourseAccessToken({
        courseId: 'course-cloud-devsecops',
        universityId: 'org-esilv',
        codeId: 'code-esilv-cloud',
      }),
    ).toThrow('COURSE_ACCESS_SECRET or ACCESS_CODE must be set');
  });
});
