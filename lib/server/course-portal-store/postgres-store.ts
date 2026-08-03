import postgres from 'postgres';
import type {
  AccessCode,
  AccountInvitation,
  ActivityLog,
  AuthAuditEvent,
  Cohort,
  Course,
  CourseAssignment,
  CourseModule,
  CoursePortalDataset,
  EmailVerificationToken,
  Enrollment,
  Organization,
  PasswordResetToken,
  PortalUser,
  Student,
} from '@/lib/types/course-portal';
import type { NormalizeDataset } from './json-store';

type SqlClient = postgres.Sql;
type QueryClient = postgres.Sql | postgres.TransactionSql;

type PostgresStoreOptions = {
  databaseUrl?: string;
  sql?: SqlClient;
  normalizeDataset: NormalizeDataset;
};

export class PostgresCoursePortalStore {
  private readonly sql: SqlClient;
  private readonly ownsClient: boolean;

  constructor(private readonly options: PostgresStoreOptions) {
    if (options.sql) {
      this.sql = options.sql;
      this.ownsClient = false;
    } else {
      if (!options.databaseUrl) {
        throw new Error('DATABASE_URL is required for the Postgres course portal store.');
      }
      this.sql = postgres(options.databaseUrl, { max: 5 });
      this.ownsClient = true;
    }
  }

  async readDataset(): Promise<CoursePortalDataset> {
    return this.readDatasetWith(this.sql);
  }

  private async readDatasetWith(sql: QueryClient): Promise<CoursePortalDataset> {
    const [
      organizations,
      users,
      students,
      cohorts,
      courses,
      modules,
      assignments,
      accessCodes,
      enrollments,
      activityLogs,
      passwordResetTokens,
      accountInvitations,
      emailVerificationTokens,
      authAuditEvents,
    ] = await Promise.all([
      sql`select * from organizations order by created_at, id`,
      sql`select * from portal_users order by created_at, id`,
      sql`select * from students order by created_at, id`,
      sql`select * from cohorts order by created_at, id`,
      sql`select * from courses order by created_at, id`,
      sql`select * from course_modules order by course_id, order_index, id`,
      sql`select * from course_assignments order by assigned_at, id`,
      sql`select * from access_codes order by created_at, id`,
      sql`select * from enrollments order by started_at, id`,
      sql`select * from activity_logs order by created_at, id`,
      sql`select * from password_reset_tokens order by created_at, id`,
      sql`select * from account_invitations order by created_at, id`,
      sql`select * from email_verification_tokens order by created_at, id`,
      sql`select * from auth_audit_events order by created_at, id`,
    ]);

    const courseModulesByCourseId = new Map<string, CourseModule[]>();
    for (const row of modules as Record<string, unknown>[]) {
      const courseId = String(row.course_id);
      const courseModules = courseModulesByCourseId.get(courseId) || [];
      courseModules.push(rowToCourseModule(row));
      courseModulesByCourseId.set(courseId, courseModules);
    }

    return this.options.normalizeDataset({
      organizations: (organizations as Record<string, unknown>[]).map(rowToOrganization),
      users: (users as Record<string, unknown>[]).map(rowToPortalUser),
      students: (students as Record<string, unknown>[]).map(rowToStudent),
      cohorts: (cohorts as Record<string, unknown>[]).map(rowToCohort),
      courses: (courses as Record<string, unknown>[]).map((row) =>
        rowToCourse(row, courseModulesByCourseId.get(String(row.id)) || []),
      ),
      assignments: (assignments as Record<string, unknown>[]).map(rowToCourseAssignment),
      accessCodes: (accessCodes as Record<string, unknown>[]).map(rowToAccessCode),
      enrollments: (enrollments as Record<string, unknown>[]).map(rowToEnrollment),
      activityLogs: (activityLogs as Record<string, unknown>[]).map(rowToActivityLog),
      passwordResetTokens: (passwordResetTokens as Record<string, unknown>[]).map(
        rowToPasswordResetToken,
      ),
      accountInvitations: (accountInvitations as Record<string, unknown>[]).map(
        rowToAccountInvitation,
      ),
      emailVerificationTokens: (emailVerificationTokens as Record<string, unknown>[]).map(
        rowToEmailVerificationToken,
      ),
      authAuditEvents: (authAuditEvents as Record<string, unknown>[]).map(rowToAuthAuditEvent),
    });
  }

  async writeDataset(dataset: CoursePortalDataset): Promise<void> {
    await this.sql.begin(async (sql) => {
      await acquirePortalMutationLock(sql);
      await replaceDataset(sql, this.options.normalizeDataset(dataset));
    });
  }

  async mutateDataset<T>(mutator: (dataset: CoursePortalDataset) => T | Promise<T>): Promise<T> {
    const transactionResult = await this.sql.begin(async (sql) => {
      await acquirePortalMutationLock(sql);
      const dataset = await this.readDatasetWith(sql);
      const result = await mutator(dataset);
      await replaceDataset(sql, this.options.normalizeDataset(dataset));
      return { value: result };
    });
    return transactionResult.value;
  }

  async close(): Promise<void> {
    if (this.ownsClient) await this.sql.end();
  }
}

async function acquirePortalMutationLock(sql: postgres.TransactionSql): Promise<void> {
  await sql`select pg_advisory_xact_lock(1279473236, 1347375956)`;
}

async function replaceDataset(
  sql: postgres.TransactionSql,
  normalized: CoursePortalDataset,
): Promise<void> {
  await sql`delete from auth_audit_events`;
  await sql`delete from email_verification_tokens`;
  await sql`delete from account_invitations`;
  await sql`delete from password_reset_tokens`;
  await sql`delete from activity_logs`;
  await sql`delete from enrollments`;
  await sql`delete from access_codes`;
  await sql`delete from course_assignments`;
  await sql`delete from course_modules`;
  await sql`delete from courses`;
  await sql`delete from portal_users`;
  await sql`delete from students`;
  await sql`delete from cohorts`;
  await sql`delete from organizations`;

  await insertRows(sql, 'organizations', normalized.organizations.map(organizationToRow));
  await insertRows(sql, 'cohorts', normalized.cohorts.map(cohortToRow));
  await insertRows(sql, 'students', normalized.students.map(studentToRow));
  await insertRows(sql, 'portal_users', normalized.users.map(portalUserToRow));
  await insertRows(sql, 'courses', normalized.courses.map(courseToRow));
  await insertRows(
    sql,
    'course_modules',
    normalized.courses.flatMap((course) =>
      course.modules.map((module, index) => courseModuleToRow(course.id, module, index)),
    ),
  );
  await insertRows(sql, 'course_assignments', normalized.assignments.map(assignmentToRow));
  await insertRows(sql, 'access_codes', normalized.accessCodes.map(accessCodeToRow));
  await insertRows(sql, 'enrollments', normalized.enrollments.map(enrollmentToRow));
  await insertRows(sql, 'activity_logs', normalized.activityLogs.map(activityLogToRow));
  await insertRows(
    sql,
    'password_reset_tokens',
    (normalized.passwordResetTokens || []).map(passwordResetTokenToRow),
  );
  await insertRows(
    sql,
    'account_invitations',
    (normalized.accountInvitations || []).map(accountInvitationToRow),
  );
  await insertRows(
    sql,
    'email_verification_tokens',
    (normalized.emailVerificationTokens || []).map(emailVerificationTokenToRow),
  );
  await insertRows(
    sql,
    'auth_audit_events',
    (normalized.authAuditEvents || []).map(authAuditToRow),
  );
}

async function insertRows(
  sql: QueryClient,
  table: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  if (rows.length === 0) return;
  await sql`insert into ${sql.unsafe(table)} ${sql(rows.map(nullifyUndefinedValues))}`;
}

function nullifyUndefinedValues(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value === undefined ? null : value]),
  );
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function optionalIso(value: unknown): string | undefined {
  return value ? toIso(value) : undefined;
}

function metadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function rowToOrganization(row: Record<string, unknown>): Organization {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    logoUrl: optionalString(row.logo_url),
    description: String(row.description || ''),
    contactEmail: String(row.contact_email || ''),
    subscriptionStatus: optionalString(
      row.subscription_status,
    ) as Organization['subscriptionStatus'],
    welcomeMessage: optionalString(row.welcome_message),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function rowToPortalUser(row: Record<string, unknown>): PortalUser {
  return {
    id: String(row.id),
    organizationId: optionalString(row.organization_id),
    studentId: optionalString(row.student_id),
    name: String(row.name),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    role: row.role as PortalUser['role'],
    canGenerateAccessCodes: Boolean(row.can_generate_access_codes),
    status: optionalString(row.status) as PortalUser['status'],
    emailVerifiedAt: optionalIso(row.email_verified_at),
    lastLoginAt: optionalIso(row.last_login_at),
    passwordChangedAt: optionalIso(row.password_changed_at),
    sessionVersion:
      typeof row.session_version === 'number'
        ? row.session_version
        : Number(row.session_version || 1),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function rowToStudent(row: Record<string, unknown>): Student {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: String(row.name),
    email: optionalString(row.email),
    externalStudentId: optionalString(row.external_student_id),
    cohortId: optionalString(row.cohort_id),
    academicYear: optionalString(row.academic_year),
    programName: optionalString(row.program_name),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function rowToCohort(row: Record<string, unknown>): Cohort {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: String(row.name),
    academicYear: optionalString(row.academic_year),
    programName: optionalString(row.program_name),
    createdAt: toIso(row.created_at),
  };
}

function rowToCourse(row: Record<string, unknown>, modules: CourseModule[]): Course {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    description: String(row.description || ''),
    category: String(row.category || ''),
    level: optionalString(row.level),
    status: row.status as Course['status'],
    generatedBy: String(row.generated_by || 'OpenMAIC'),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    estimatedDurationMinutes:
      row.estimated_duration_minutes === null || row.estimated_duration_minutes === undefined
        ? undefined
        : Number(row.estimated_duration_minutes),
    modules,
    coverAsset: optionalString(row.cover_asset),
    coverTone: optionalString(row.cover_tone) as Course['coverTone'],
    classroomId: optionalString(row.classroom_id),
  };
}

function rowToCourseModule(row: Record<string, unknown>): CourseModule {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description || ''),
    durationMinutes: Number(row.duration_minutes || 0),
    classroomId: optionalString(row.classroom_id),
  };
}

function rowToCourseAssignment(row: Record<string, unknown>): CourseAssignment {
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    organizationId: String(row.organization_id),
    cohortId: optionalString(row.cohort_id),
    assignedAt: toIso(row.assigned_at),
    assignedByUserId: String(row.assigned_by_user_id),
    teacherUserId: optionalString(row.teacher_user_id),
  };
}

function rowToAccessCode(row: Record<string, unknown>): AccessCode {
  return {
    id: String(row.id),
    codeHash: String(row.code_hash),
    organizationId: String(row.organization_id),
    courseId: String(row.course_id),
    cohortId: optionalString(row.cohort_id),
    studentId: optionalString(row.student_id),
    createdByUserId: String(row.created_by_user_id),
    expiresAt: optionalIso(row.expires_at),
    maxUses: row.max_uses === null || row.max_uses === undefined ? undefined : Number(row.max_uses),
    currentUses: Number(row.current_uses || 0),
    isActive: Boolean(row.is_active),
    createdAt: toIso(row.created_at),
    disabledAt: optionalIso(row.disabled_at),
  };
}

function rowToEnrollment(row: Record<string, unknown>): Enrollment {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    courseId: String(row.course_id),
    organizationId: String(row.organization_id),
    accessCodeId: optionalString(row.access_code_id),
    status: row.status as Enrollment['status'],
    progressPercentage: Number(row.progress_percentage || 0),
    startedAt: toIso(row.started_at),
    completedAt: optionalIso(row.completed_at),
    lastActivityAt: optionalIso(row.last_activity_at),
  };
}

function rowToActivityLog(row: Record<string, unknown>): ActivityLog {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    studentId: optionalString(row.student_id),
    courseId: optionalString(row.course_id),
    action: String(row.action),
    metadata: metadata(row.metadata),
    createdAt: toIso(row.created_at),
  };
}

function rowToPasswordResetToken(row: Record<string, unknown>): PasswordResetToken {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    tokenHash: String(row.token_hash),
    createdAt: toIso(row.created_at),
    expiresAt: toIso(row.expires_at),
    usedAt: optionalIso(row.used_at),
    requestedIp: optionalString(row.requested_ip),
  };
}

function rowToAccountInvitation(row: Record<string, unknown>): AccountInvitation {
  return {
    id: String(row.id),
    organizationId: optionalString(row.organization_id),
    email: String(row.email),
    name: optionalString(row.name),
    role: row.role as AccountInvitation['role'],
    invitedByUserId: String(row.invited_by_user_id),
    tokenHash: String(row.token_hash),
    status: row.status as AccountInvitation['status'],
    createdAt: toIso(row.created_at),
    expiresAt: toIso(row.expires_at),
    acceptedAt: optionalIso(row.accepted_at),
    acceptedUserId: optionalString(row.accepted_user_id),
  };
}

function rowToEmailVerificationToken(row: Record<string, unknown>): EmailVerificationToken {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    tokenHash: String(row.token_hash),
    createdAt: toIso(row.created_at),
    expiresAt: toIso(row.expires_at),
    usedAt: optionalIso(row.used_at),
  };
}

function rowToAuthAuditEvent(row: Record<string, unknown>): AuthAuditEvent {
  return {
    id: String(row.id),
    userId: optionalString(row.user_id),
    organizationId: optionalString(row.organization_id),
    email: optionalString(row.email),
    action: String(row.action),
    ip: optionalString(row.ip),
    metadata: metadata(row.metadata),
    createdAt: toIso(row.created_at),
  };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function organizationToRow(organization: Organization) {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    logo_url: organization.logoUrl,
    description: organization.description,
    contact_email: organization.contactEmail,
    subscription_status: organization.subscriptionStatus,
    welcome_message: organization.welcomeMessage,
    created_at: organization.createdAt,
    updated_at: organization.updatedAt,
  };
}

function portalUserToRow(user: PortalUser) {
  return {
    id: user.id,
    organization_id: user.organizationId,
    student_id: user.studentId,
    name: user.name,
    email: user.email,
    password_hash: user.passwordHash,
    role: user.role,
    can_generate_access_codes: Boolean(user.canGenerateAccessCodes),
    status: user.status || 'active',
    email_verified_at: user.emailVerifiedAt,
    last_login_at: user.lastLoginAt,
    password_changed_at: user.passwordChangedAt,
    session_version: user.sessionVersion || 1,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

function studentToRow(student: Student) {
  return {
    id: student.id,
    organization_id: student.organizationId,
    name: student.name,
    email: student.email,
    external_student_id: student.externalStudentId,
    cohort_id: student.cohortId,
    academic_year: student.academicYear,
    program_name: student.programName,
    created_at: student.createdAt,
    updated_at: student.updatedAt,
  };
}

function cohortToRow(cohort: Cohort) {
  return {
    id: cohort.id,
    organization_id: cohort.organizationId,
    name: cohort.name,
    academic_year: cohort.academicYear,
    program_name: cohort.programName,
    created_at: cohort.createdAt,
  };
}

function courseToRow(course: Course) {
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    category: course.category,
    level: course.level,
    status: course.status,
    generated_by: course.generatedBy,
    created_at: course.createdAt,
    updated_at: course.updatedAt,
    estimated_duration_minutes: course.estimatedDurationMinutes,
    cover_asset: course.coverAsset,
    cover_tone: course.coverTone,
    classroom_id: course.classroomId,
  };
}

function courseModuleToRow(courseId: string, module: CourseModule, index: number) {
  return {
    course_id: courseId,
    id: module.id,
    order_index: index,
    title: module.title,
    description: module.description,
    duration_minutes: module.durationMinutes,
    classroom_id: module.classroomId,
  };
}

function assignmentToRow(assignment: CourseAssignment) {
  return {
    id: assignment.id,
    course_id: assignment.courseId,
    organization_id: assignment.organizationId,
    cohort_id: assignment.cohortId,
    assigned_at: assignment.assignedAt,
    assigned_by_user_id: assignment.assignedByUserId,
    teacher_user_id: assignment.teacherUserId,
  };
}

function accessCodeToRow(accessCode: AccessCode) {
  return {
    id: accessCode.id,
    code_hash: accessCode.codeHash,
    organization_id: accessCode.organizationId,
    course_id: accessCode.courseId,
    cohort_id: accessCode.cohortId,
    student_id: accessCode.studentId,
    created_by_user_id: accessCode.createdByUserId,
    expires_at: accessCode.expiresAt,
    max_uses: accessCode.maxUses,
    current_uses: accessCode.currentUses,
    is_active: accessCode.isActive,
    created_at: accessCode.createdAt,
    disabled_at: accessCode.disabledAt,
  };
}

function enrollmentToRow(enrollment: Enrollment) {
  return {
    id: enrollment.id,
    student_id: enrollment.studentId,
    course_id: enrollment.courseId,
    organization_id: enrollment.organizationId,
    access_code_id: enrollment.accessCodeId,
    status: enrollment.status,
    progress_percentage: enrollment.progressPercentage,
    started_at: enrollment.startedAt,
    completed_at: enrollment.completedAt,
    last_activity_at: enrollment.lastActivityAt,
  };
}

function activityLogToRow(activity: ActivityLog) {
  return {
    id: activity.id,
    organization_id: activity.organizationId,
    student_id: activity.studentId,
    course_id: activity.courseId,
    action: activity.action,
    metadata: activity.metadata,
    created_at: activity.createdAt,
  };
}

function passwordResetTokenToRow(token: PasswordResetToken) {
  return {
    id: token.id,
    user_id: token.userId,
    token_hash: token.tokenHash,
    created_at: token.createdAt,
    expires_at: token.expiresAt,
    used_at: token.usedAt,
    requested_ip: token.requestedIp,
  };
}

function accountInvitationToRow(invitation: AccountInvitation) {
  return {
    id: invitation.id,
    organization_id: invitation.organizationId,
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    invited_by_user_id: invitation.invitedByUserId,
    token_hash: invitation.tokenHash,
    status: invitation.status,
    created_at: invitation.createdAt,
    expires_at: invitation.expiresAt,
    accepted_at: invitation.acceptedAt,
    accepted_user_id: invitation.acceptedUserId,
  };
}

function emailVerificationTokenToRow(token: EmailVerificationToken) {
  return {
    id: token.id,
    user_id: token.userId,
    token_hash: token.tokenHash,
    created_at: token.createdAt,
    expires_at: token.expiresAt,
    used_at: token.usedAt,
  };
}

function authAuditToRow(event: AuthAuditEvent) {
  return {
    id: event.id,
    user_id: event.userId,
    organization_id: event.organizationId,
    email: event.email,
    action: event.action,
    ip: event.ip,
    metadata: event.metadata,
    created_at: event.createdAt,
  };
}
