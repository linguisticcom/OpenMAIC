export type CourseStatus = 'active' | 'draft' | 'locked' | 'completed';

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled';

export type PortalUserRole =
  | 'platform-admin'
  | 'organization-admin'
  | 'teacher-manager'
  | 'student';

export type PortalUserStatus = 'active' | 'invited' | 'disabled';

export type EnrollmentStatus = 'not_started' | 'in_progress' | 'completed';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description: string;
  contactEmail: string;
  subscriptionStatus?: SubscriptionStatus;
  welcomeMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export type University = Organization;

export interface PortalUser {
  id: string;
  organizationId?: string;
  studentId?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: PortalUserRole;
  canGenerateAccessCodes?: boolean;
  status?: PortalUserStatus;
  emailVerifiedAt?: string;
  lastLoginAt?: string;
  passwordChangedAt?: string;
  sessionVersion?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  classroomId?: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  level?: string;
  status: CourseStatus;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
  estimatedDurationMinutes?: number;
  modules: CourseModule[];
  coverAsset?: string;
  coverTone?: 'violet' | 'blue' | 'emerald' | 'amber' | 'rose';
  classroomId?: string;
}

export interface CourseAssignment {
  id: string;
  courseId: string;
  organizationId: string;
  cohortId?: string;
  assignedAt: string;
  assignedByUserId: string;
  teacherUserId?: string;
}

export interface Student {
  id: string;
  organizationId: string;
  name: string;
  email?: string;
  externalStudentId?: string;
  cohortId?: string;
  academicYear?: string;
  programName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  organizationId: string;
  accessCodeId?: string;
  status: EnrollmentStatus;
  progressPercentage: number;
  startedAt: string;
  completedAt?: string;
  lastActivityAt?: string;
}

export interface AccessCode {
  id: string;
  codeHash: string;
  organizationId: string;
  courseId: string;
  cohortId?: string;
  studentId?: string;
  createdByUserId: string;
  expiresAt?: string;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  createdAt: string;
  disabledAt?: string;
}

export interface AccessCodeView {
  id: string;
  organizationId: string;
  courseId: string;
  cohortId?: string;
  studentId?: string;
  createdByUserId: string;
  expiresAt?: string;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  createdAt: string;
  disabledAt?: string;
  courseTitle: string;
  organizationName: string;
  createdByName: string;
  cohortName?: string;
  cohortAcademicYear?: string;
  cohortProgramName?: string;
  studentName?: string;
}

export interface Cohort {
  id: string;
  organizationId: string;
  name: string;
  academicYear?: string;
  programName?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  organizationId: string;
  studentId?: string;
  courseId?: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  requestedIp?: string;
}

export interface AccountInvitation {
  id: string;
  organizationId?: string;
  email: string;
  name?: string;
  role: PortalUserRole;
  invitedByUserId: string;
  tokenHash: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  acceptedUserId?: string;
}

export interface EmailVerificationToken {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

export interface AuthAuditEvent {
  id: string;
  userId?: string;
  organizationId?: string;
  email?: string;
  action: string;
  ip?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CoursePortalDataset {
  organizations: Organization[];
  users: PortalUser[];
  courses: Course[];
  assignments: CourseAssignment[];
  students: Student[];
  enrollments: Enrollment[];
  accessCodes: AccessCode[];
  cohorts: Cohort[];
  activityLogs: ActivityLog[];
  passwordResetTokens?: PasswordResetToken[];
  accountInvitations?: AccountInvitation[];
  emailVerificationTokens?: EmailVerificationToken[];
  authAuditEvents?: AuthAuditEvent[];
}

export interface CoursePortalCardData {
  assignmentId: string;
  cohortId?: string;
  university: University;
  course: Course;
  enrolledStudents: number;
  completionRate: number;
}

export interface CoursePortalCardView extends CoursePortalCardData {
  accessGranted: boolean;
}

export interface OrganizationCourseSummary extends CoursePortalCardData {
  organization: Organization;
  activeAccessCodes: number;
}

export interface StudentCourseProgress {
  course: Course;
  enrollment?: Enrollment;
  accessCode?: AccessCodeView;
}

export interface OrganizationDashboardSummary {
  organization: Organization;
  activeCourses: number;
  enrolledStudents: number;
  activeAccessCodes: number;
  averageCompletionRate: number;
  recentActivity: ActivityLog[];
  courses: OrganizationCourseSummary[];
}

export interface StudentManagementSummary {
  student: Student;
  coursesEnrolled: number;
  averageProgress: number;
  lastActivityAt?: string;
  accessCodeUsed?: string;
  completionStatus: EnrollmentStatus;
}

export interface CourseAccessValidationInput {
  organizationId?: string;
  organizationSlug?: string;
  universityId?: string;
  courseId?: string;
  courseSlug?: string;
  accessCode: string;
  cohortId?: string;
  studentId?: string;
}

export type CourseAccessInvalidReason =
  | 'missing-fields'
  | 'organization-not-found'
  | 'course-not-found'
  | 'course-not-assigned'
  | 'invalid-code'
  | 'code-not-linked'
  | 'code-expired'
  | 'code-inactive'
  | 'usage-limit-reached';

export interface CourseAccessGrant {
  course: Course;
  organization: Organization;
  university: University;
  assignment: CourseAssignment;
  accessCode: AccessCode;
  enrollment?: Enrollment;
}
