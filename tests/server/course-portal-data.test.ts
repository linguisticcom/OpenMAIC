import { describe, expect, it } from 'vitest';
import {
  createOrganizationAccessCode,
  disableOrganizationAccessCode,
  getPortalUserByEmail,
  getVisibleOrganizationCourseDetail,
  getVisibleOrganizationStudentDetail,
  hasPortalAccountCourseAccess,
  listOrganizationAccessCodes,
  listVisibleOrganizationAccessCodes,
  listVisibleOrganizationCourseSummaries,
  listVisibleOrganizationStudentSummaries,
  trackStudentActivity,
  updateGlobalCourseStatus,
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

  it('rejects submitted student identifiers outside the selected organization', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-cloud-devsecops',
      organizationId: 'org-esilv',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      accessCode: 'ESILV-CLOUD-M2',
      studentId: 'student-psb-1',
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('code-not-linked');
      expect(result.message).toBe('This code is not linked to the selected student.');
    }
  });

  it('rejects submitted student identifiers outside a cohort-scoped code', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-business-genai',
      organizationId: 'org-psb',
      cohortId: 'cohort-psb-ai-product',
      accessCode: 'PSB-GENAI',
      studentId: 'student-psb-2',
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('code-not-linked');
      expect(result.message).toBe('This code is not linked to the selected student.');
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

  it('rejects access-code creation for a student outside the selected cohort', async () => {
    const result = await createOrganizationAccessCode({
      organizationId: 'org-psb',
      courseId: 'course-business-genai',
      cohortId: 'cohort-psb-ai-product',
      studentId: 'student-psb-2',
      createdByUserId: 'user-psb-admin',
    });

    expect(result).toEqual({ error: 'Student is not in the selected cohort.' });
  });

  it('limits teacher-managed access codes to assigned courses', async () => {
    const teacher = await getPortalUserByEmail('teacher@esilv.local');
    expect(teacher).toBeDefined();
    if (!teacher) return;

    const accessCodes = await listVisibleOrganizationAccessCodes(teacher, 'org-esilv');
    expect(accessCodes.map((code) => code.id)).toEqual(['code-esilv-cloud']);

    await expect(
      createOrganizationAccessCode({
        organizationId: 'org-esilv',
        courseId: 'course-ai-foundations',
        createdByUserId: teacher.id,
      }),
    ).resolves.toEqual({ error: 'Course is not assigned to this teacher manager.' });

    await expect(
      disableOrganizationAccessCode({
        organizationId: 'org-esilv',
        accessCodeId: 'code-esilv-ai',
        disabledByUserId: teacher.id,
      }),
    ).resolves.toEqual({ error: 'Course is not assigned to this teacher manager.' });
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

    const studentDetail = await getVisibleOrganizationStudentDetail(
      teacher,
      'org-esilv',
      'student-esilv-1',
    );
    expect(studentDetail?.progress.map((item) => item.course.id).sort()).toEqual([
      'course-cloud-devsecops',
      'course-secure-automation',
    ]);
  });

  it('shows organization admins every organization student, including unenrolled learners', async () => {
    const admin = await getPortalUserByEmail('admin@esilv.local');
    expect(admin).toBeDefined();
    if (!admin) return;

    const students = await listVisibleOrganizationStudentSummaries(admin, 'org-esilv');
    expect(students.map((item) => item.student.id).sort()).toEqual([
      'student-esilv-1',
      'student-esilv-2',
      'student-esilv-3',
    ]);

    const unenrolledSummary = students.find((item) => item.student.id === 'student-esilv-3');
    expect(unenrolledSummary).toMatchObject({
      coursesEnrolled: 0,
      averageProgress: 0,
      completionStatus: 'not_started',
    });

    const studentDetail = await getVisibleOrganizationStudentDetail(
      admin,
      'org-esilv',
      'student-esilv-3',
    );
    expect(studentDetail?.progress.map((item) => item.course.id).sort()).toEqual([
      'course-ai-foundations',
      'course-cloud-devsecops',
      'course-secure-automation',
    ]);
    expect(studentDetail?.progress.every((item) => item.enrollment === undefined)).toBe(true);
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

    const studentDetail = await getVisibleOrganizationStudentDetail(
      student,
      'org-esilv',
      'student-esilv-1',
    );
    expect(studentDetail?.progress.map((item) => item.course.id)).toEqual([
      'course-cloud-devsecops',
    ]);
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

  it('rejects student activity for assigned courses without an enrollment', async () => {
    await expect(
      trackStudentActivity({
        organizationId: 'org-esilv',
        studentId: 'student-esilv-1',
        courseId: 'course-secure-automation',
        action: 'lesson.viewed',
        progressPercentage: 20,
      }),
    ).resolves.toEqual({ error: 'Student is not enrolled in this course.' });
  });
});

describe('global course management', () => {
  it('rejects unsupported global course statuses', async () => {
    await expect(
      updateGlobalCourseStatus({
        courseId: 'course-cloud-devsecops',
        status: 'archived',
      }),
    ).resolves.toEqual({ error: 'Invalid course status.' });
  });
});
