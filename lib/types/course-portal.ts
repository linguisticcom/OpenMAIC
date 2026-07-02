export type CourseStatus = 'active' | 'draft' | 'locked' | 'completed';

export interface University {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description: string;
  welcomeMessage?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
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
  universityId: string;
  cohortId?: string;
}

export interface AccessCode {
  id: string;
  code: string;
  courseId: string;
  universityId: string;
  cohortId?: string;
  expiresAt?: string;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
}

export interface CoursePortalDataset {
  universities: University[];
  courses: Course[];
  assignments: CourseAssignment[];
  accessCodes: AccessCode[];
}

export interface CoursePortalCardData {
  assignmentId: string;
  cohortId?: string;
  university: University;
  course: Course;
}

export interface CoursePortalCardView extends CoursePortalCardData {
  accessGranted: boolean;
}

export interface CourseAccessValidationInput {
  courseId: string;
  universityId: string;
  accessCode: string;
  cohortId?: string;
}

export type CourseAccessInvalidReason =
  | 'missing-fields'
  | 'course-not-found'
  | 'university-not-found'
  | 'course-not-assigned'
  | 'invalid-code'
  | 'code-not-linked'
  | 'code-expired'
  | 'code-inactive'
  | 'usage-limit-reached';

export interface CourseAccessGrant {
  course: Course;
  university: University;
  assignment: CourseAssignment;
  accessCode: AccessCode;
}
