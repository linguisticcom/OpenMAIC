import { describe, expect, it } from 'vitest';
import {
  createOrganizationAccessCode,
  getPortalUserByEmail,
  getVisibleOrganizationCourseDetail,
  hasPortalAccountCourseAccess,
  listOrganizationAccessCodes,
  listVisibleOrganizationCourseSummaries,
  listVisibleOrganizationStudentSummaries,
  validateCourseAccessGrant,
} from '@/lib/server/course-portal-data';

describe('validateCourseAccessGrant', () => {
  it('accepts a valid code for the assigned university and cohort', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-cloud-devsecops',
      organizationId: 'org-esilv',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      accessCode: 'ESILV-CLOUD-M2',
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.grant.assignment.cohortId).toBe('cohort-esilv-m2-cyber-cloud');
      expect(result.grant.accessCode.id).toBe('code-esilv-cloud');
    }
  });

  it('rejects cohort-scoped access when the submitted cohort conflicts', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-cloud-devsecops',
      organizationId: 'org-esilv',
      cohortId: 'cohort-psb-ai-product',
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
      organizationId: 'org-esilv',
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
      organizationId: 'org-esilv',
      accessCode: 'EXPIRED-COURSE',
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('code-expired');
    }
  });

  it('rejects a code for the right course but wrong organization', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-cloud-devsecops',
      organizationId: 'org-esilv',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      accessCode: 'INGETIS-CLOUD',
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('code-not-linked');
    }
  });

  it('exposes readable cohort metadata without exposing code hashes', async () => {
    const accessCodes = await listOrganizationAccessCodes('org-esilv');
    const cloudCode = accessCodes.find((accessCode) => accessCode.id === 'code-esilv-cloud');

    expect(cloudCode?.cohortName).toBe('M2 Cybersecurity and Cloud Computing');
    expect(cloudCode?.cohortProgramName).toBe('Cybersecurity and Cloud Computing');
    expect(JSON.stringify(cloudCode)).not.toContain('codeHash');
  });

  it('rejects access-code creation for a cohort outside the organization assignment', async () => {
    const result = await createOrganizationAccessCode({
      organizationId: 'org-esilv',
      courseId: 'course-ai-foundations',
      cohortId: 'cohort-psb-ai-product',
      createdByUserId: 'user-esilv-admin',
    });

    expect(result).toEqual({ error: 'Cohort does not belong to this organization.' });
  });

  it('rejects access-code creation when the cohort is not assigned to the selected course', async () => {
    const result = await createOrganizationAccessCode({
      organizationId: 'org-esilv',
      courseId: 'course-ai-foundations',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      createdByUserId: 'user-esilv-admin',
    });

    expect(result).toEqual({ error: 'Selected cohort is not assigned to this course.' });
  });
});

describe('tenant visibility rules', () => {
  it('limits teacher managers to assigned courses and enrolled students', async () => {
    const teacher = await getPortalUserByEmail('teacher@esilv.local');
    expect(teacher).toBeDefined();
    if (!teacher) return;

    const courses = await listVisibleOrganizationCourseSummaries(teacher, 'org-esilv');
    expect(courses.map((item) => item.course.id).sort()).toEqual([
      'course-cloud-devsecops',
      'course-secure-automation',
    ]);

    const students = await listVisibleOrganizationStudentSummaries(teacher, 'org-esilv');
    expect(
      students.map((item) => item.student.organizationId).every((id) => id === 'org-esilv'),
    ).toBe(true);
    expect(students.map((item) => item.student.id).sort()).toEqual([
      'student-esilv-1',
      'student-esilv-2',
    ]);
  });

  it('limits student accounts to their own enrolled course and enrollment detail', async () => {
    const student = await getPortalUserByEmail('student@esilv.local');
    expect(student).toBeDefined();
    if (!student) return;

    const courses = await listVisibleOrganizationCourseSummaries(student, 'org-esilv');
    expect(courses.map((item) => item.course.id)).toEqual(['course-cloud-devsecops']);

    const detail = await getVisibleOrganizationCourseDetail(
      student,
      'org-esilv',
      'course-cloud-devsecops',
    );
    expect(detail?.students.map((item) => item.id)).toEqual(['student-esilv-1']);
    expect(detail?.enrollments.map((item) => item.studentId)).toEqual(['student-esilv-1']);
  });

  it('grants public course account access only to enrolled student accounts', async () => {
    const student = await getPortalUserByEmail('student@esilv.local');
    const teacher = await getPortalUserByEmail('teacher@esilv.local');
    expect(student).toBeDefined();
    expect(teacher).toBeDefined();
    if (!student || !teacher) return;

    await expect(
      hasPortalAccountCourseAccess(student, {
        organizationId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
      }),
    ).resolves.toBe(true);

    await expect(
      hasPortalAccountCourseAccess(student, {
        organizationId: 'org-esilv',
        courseId: 'course-secure-automation',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
      }),
    ).resolves.toBe(false);

    await expect(
      hasPortalAccountCourseAccess(teacher, {
        organizationId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
      }),
    ).resolves.toBe(false);
  });
});
