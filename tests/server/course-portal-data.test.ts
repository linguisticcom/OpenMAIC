import { describe, expect, it } from 'vitest';
import { validateCourseAccessGrant } from '@/lib/server/course-portal-data';

describe('validateCourseAccessGrant', () => {
  it('accepts a valid code for the assigned university and cohort', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-cloud-devsecops',
      universityId: 'uni-esilv',
      cohortId: 'm2-cyber-cloud',
      accessCode: 'ESILV-CLOUD-M2',
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.grant.assignment.cohortId).toBe('m2-cyber-cloud');
      expect(result.grant.accessCode.id).toBe('code-esilv-cloud');
    }
  });

  it('rejects cohort-scoped access when the cohort is omitted', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-cloud-devsecops',
      universityId: 'uni-esilv',
      accessCode: 'ESILV-CLOUD-M2',
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('course-not-assigned');
    }
  });

  it('rejects a real code linked to another course or university', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-ai-foundations',
      universityId: 'uni-esilv',
      accessCode: 'PSB-GENAI',
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('code-not-linked');
    }
  });

  it('rejects expired codes', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-ai-foundations',
      universityId: 'uni-esilv',
      accessCode: 'EXPIRED-COURSE',
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('code-expired');
    }
  });
});
