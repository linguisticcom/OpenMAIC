import { promises as fs } from 'fs';
import path from 'path';
import { createHash, randomBytes } from 'crypto';
import type {
  AccessCode,
  AccessCodeView,
  ActivityLog,
  Cohort,
  Course,
  CourseAccessGrant,
  CourseAccessInvalidReason,
  CourseAccessValidationInput,
  CourseAssignment,
  CoursePortalCardData,
  CoursePortalDataset,
  Enrollment,
  Organization,
  OrganizationCourseSummary,
  OrganizationDashboardSummary,
  PortalUser,
  Student,
  StudentManagementSummary,
  StudentCourseProgress,
  University,
} from '@/lib/types/course-portal';

const COURSE_PORTAL_DATA_FILE = path.join(process.cwd(), 'data', 'course-portal', 'catalog.json');
const SEED_NOW = '2026-07-02T09:00:00.000Z';
const PLATFORM_ADMIN_ID = 'user-platform-admin';

export function hashAccessCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

export function hashPortalPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function cloneDataset(dataset: CoursePortalDataset): CoursePortalDataset {
  return JSON.parse(JSON.stringify(dataset)) as CoursePortalDataset;
}

const seedOrganizations: Organization[] = [
  {
    id: 'org-esilv',
    name: 'ESILV',
    slug: 'esilv',
    logoUrl: '/logo-horizontal.png',
    description:
      'Engineering and digital innovation courses prepared for cybersecurity, cloud, and AI cohorts.',
    contactEmail: 'learning-admin@esilv.example',
    subscriptionStatus: 'active',
    welcomeMessage: 'Access your OpenMAIC classrooms for platform, security, and AI engineering.',
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: SEED_NOW,
  },
  {
    id: 'org-ingetis',
    name: 'INGETIS',
    slug: 'ingetis',
    logoUrl: '/logo-horizontal.png',
    description:
      'Professional training courses for cloud infrastructure, DevOps delivery, and applied automation.',
    contactEmail: 'training@ingetis.example',
    subscriptionStatus: 'trial',
    welcomeMessage: 'Browse assigned courses and unlock the modules shared with your cohort.',
    createdAt: '2026-06-03T09:00:00.000Z',
    updatedAt: SEED_NOW,
  },
  {
    id: 'org-psb',
    name: 'Paris School of Business',
    slug: 'psb',
    logoUrl: '/logo-horizontal.png',
    description:
      'Business-focused AI literacy and product strategy courses generated with OpenMAIC.',
    contactEmail: 'faculty-success@psb.example',
    subscriptionStatus: 'active',
    welcomeMessage: 'Continue your assigned learning path with institution-specific access.',
    createdAt: '2026-06-05T09:00:00.000Z',
    updatedAt: SEED_NOW,
  },
];

const seedUsers: PortalUser[] = [
  {
    id: PLATFORM_ADMIN_ID,
    name: 'OpenMAIC Platform Admin',
    email: 'platform@openmaic.local',
    passwordHash: hashPortalPassword('openmaic-demo'),
    role: 'platform-admin',
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: SEED_NOW,
  },
  {
    id: 'user-esilv-admin',
    organizationId: 'org-esilv',
    name: 'ESILV Learning Admin',
    email: 'admin@esilv.local',
    passwordHash: hashPortalPassword('openmaic-demo'),
    role: 'organization-admin',
    createdAt: '2026-06-01T09:15:00.000Z',
    updatedAt: SEED_NOW,
  },
  {
    id: 'user-ingetis-admin',
    organizationId: 'org-ingetis',
    name: 'INGETIS Program Manager',
    email: 'admin@ingetis.local',
    passwordHash: hashPortalPassword('openmaic-demo'),
    role: 'organization-admin',
    createdAt: '2026-06-03T09:15:00.000Z',
    updatedAt: SEED_NOW,
  },
  {
    id: 'user-psb-admin',
    organizationId: 'org-psb',
    name: 'PSB Course Manager',
    email: 'admin@psb.local',
    passwordHash: hashPortalPassword('openmaic-demo'),
    role: 'organization-admin',
    createdAt: '2026-06-05T09:15:00.000Z',
    updatedAt: SEED_NOW,
  },
  {
    id: 'user-esilv-teacher',
    organizationId: 'org-esilv',
    name: 'ESILV Cloud Teacher',
    email: 'teacher@esilv.local',
    passwordHash: hashPortalPassword('openmaic-demo'),
    role: 'teacher-manager',
    canGenerateAccessCodes: true,
    createdAt: '2026-06-07T09:00:00.000Z',
    updatedAt: SEED_NOW,
  },
  {
    id: 'user-esilv-student-1',
    organizationId: 'org-esilv',
    studentId: 'student-esilv-1',
    name: 'Amina Laurent',
    email: 'student@esilv.local',
    passwordHash: hashPortalPassword('openmaic-demo'),
    role: 'student',
    createdAt: '2026-06-14T09:20:00.000Z',
    updatedAt: SEED_NOW,
  },
  {
    id: 'user-psb-student-1',
    organizationId: 'org-psb',
    studentId: 'student-psb-1',
    name: 'Lucas Martin',
    email: 'student@psb.local',
    passwordHash: hashPortalPassword('openmaic-demo'),
    role: 'student',
    createdAt: '2026-06-19T09:20:00.000Z',
    updatedAt: SEED_NOW,
  },
];

const seedCourses: Course[] = [
  {
    id: 'course-ai-foundations',
    title: 'AI Foundations for Higher Education',
    slug: 'ai-foundations-higher-education',
    description:
      'A practical introduction to generative AI concepts, responsible use, prompting, and classroom-ready workflows.',
    category: 'Artificial Intelligence',
    level: 'Beginner',
    status: 'active',
    generatedBy: 'OpenMAIC',
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-28T14:30:00.000Z',
    estimatedDurationMinutes: 180,
    coverAsset: '/avatars/scholar.svg',
    coverTone: 'violet',
    modules: [
      {
        id: 'module-ai-1',
        title: 'How generative AI systems work',
        description: 'Core vocabulary, model behavior, and practical limits.',
        durationMinutes: 35,
      },
      {
        id: 'module-ai-2',
        title: 'Prompting and classroom workflows',
        description: 'Structured prompts, examples, and classroom task patterns.',
        durationMinutes: 45,
      },
      {
        id: 'module-ai-3',
        title: 'Responsible use and assessment',
        description: 'Bias, privacy, academic integrity, and evaluation guardrails.',
        durationMinutes: 55,
      },
    ],
  },
  {
    id: 'course-cloud-devsecops',
    title: 'Cloud DevSecOps Delivery Lab',
    slug: 'cloud-devsecops-delivery-lab',
    description:
      'Hands-on Kubernetes, Terraform, CI/CD, and security controls for platform engineering teams.',
    category: 'Cloud and DevSecOps',
    level: 'Advanced',
    status: 'active',
    generatedBy: 'OpenMAIC',
    createdAt: '2026-06-04T10:00:00.000Z',
    updatedAt: '2026-06-25T11:20:00.000Z',
    estimatedDurationMinutes: 240,
    coverAsset: '/avatars/builder.svg',
    coverTone: 'blue',
    modules: [
      {
        id: 'module-cloud-1',
        title: 'Platform baseline and environments',
        description: 'Repository layout, environment strategy, and release flow.',
        durationMinutes: 40,
      },
      {
        id: 'module-cloud-2',
        title: 'Infrastructure as code controls',
        description: 'Terraform structure, review gates, tagging, and drift checks.',
        durationMinutes: 65,
      },
      {
        id: 'module-cloud-3',
        title: 'GitOps deployment and rollback',
        description: 'ArgoCD promotion, health signals, and safe rollback paths.',
        durationMinutes: 75,
      },
    ],
  },
  {
    id: 'course-secure-automation',
    title: 'Secure Automation with AI Agents',
    slug: 'secure-automation-ai-agents',
    description:
      'Design automation workflows that combine AI assistance with reviewable evidence and operational guardrails.',
    category: 'Security Automation',
    level: 'Intermediate',
    status: 'locked',
    generatedBy: 'OpenMAIC',
    createdAt: '2026-06-08T08:45:00.000Z',
    updatedAt: '2026-06-30T08:45:00.000Z',
    estimatedDurationMinutes: 150,
    coverAsset: '/avatars/coder.svg',
    coverTone: 'emerald',
    modules: [
      {
        id: 'module-auto-1',
        title: 'Automation risk model',
        description: 'Where AI agents help, where deterministic controls must win.',
        durationMinutes: 35,
      },
      {
        id: 'module-auto-2',
        title: 'Evidence-first workflow design',
        description: 'Logs, diffs, validations, and reviewer-readable summaries.',
        durationMinutes: 50,
      },
      {
        id: 'module-auto-3',
        title: 'Human approval and rollback',
        description: 'Designing intervention points for sensitive operations.',
        durationMinutes: 45,
      },
    ],
  },
  {
    id: 'course-business-genai',
    title: 'Generative AI Product Strategy',
    slug: 'generative-ai-product-strategy',
    description:
      'A client-facing business course on identifying AI opportunities, scoping pilots, and measuring adoption.',
    category: 'Business and Product',
    level: 'Intermediate',
    status: 'draft',
    generatedBy: 'OpenMAIC',
    createdAt: '2026-06-12T12:00:00.000Z',
    updatedAt: '2026-06-26T16:00:00.000Z',
    estimatedDurationMinutes: 210,
    coverAsset: '/avatars/teacher.svg',
    coverTone: 'rose',
    modules: [
      {
        id: 'module-product-1',
        title: 'Opportunity framing',
        description: 'Finding useful, feasible, and measurable AI product ideas.',
        durationMinutes: 45,
      },
      {
        id: 'module-product-2',
        title: 'Pilot design',
        description: 'Scope, assumptions, data readiness, and stakeholder alignment.',
        durationMinutes: 60,
      },
      {
        id: 'module-product-3',
        title: 'Adoption and governance',
        description: 'Metrics, support, risk review, and post-pilot decisions.',
        durationMinutes: 55,
      },
    ],
  },
  {
    id: 'course-data-literacy',
    title: 'Data Literacy for Applied AI',
    slug: 'data-literacy-applied-ai',
    description:
      'Build the analytical vocabulary needed to evaluate AI outputs, datasets, and decision quality.',
    category: 'Data and Analytics',
    level: 'Beginner',
    status: 'completed',
    generatedBy: 'OpenMAIC',
    createdAt: '2026-05-18T09:30:00.000Z',
    updatedAt: '2026-06-18T09:30:00.000Z',
    estimatedDurationMinutes: 120,
    coverAsset: '/avatars/explorer.svg',
    coverTone: 'amber',
    modules: [
      {
        id: 'module-data-1',
        title: 'Reading data with context',
        description: 'Population, sample, metric definitions, and caveats.',
        durationMinutes: 30,
      },
      {
        id: 'module-data-2',
        title: 'Signals and uncertainty',
        description: 'Variation, confidence, and quality checks.',
        durationMinutes: 45,
      },
      {
        id: 'module-data-3',
        title: 'Decision-ready summaries',
        description: 'Turning analysis into clear recommendations.',
        durationMinutes: 35,
      },
    ],
  },
];

const seedCohorts: Cohort[] = [
  {
    id: 'cohort-esilv-m2-cyber-cloud',
    organizationId: 'org-esilv',
    name: 'M2 Cybersecurity and Cloud Computing',
    academicYear: '2026-2027',
    programName: 'Cybersecurity and Cloud Computing',
    createdAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'cohort-ingetis-devops',
    organizationId: 'org-ingetis',
    name: 'DevOps Professional Track',
    academicYear: '2026',
    programName: 'Cloud Infrastructure',
    createdAt: '2026-06-03T10:00:00.000Z',
  },
  {
    id: 'cohort-psb-ai-product',
    organizationId: 'org-psb',
    name: 'AI Product Strategy Cohort',
    academicYear: '2026',
    programName: 'Business and Product',
    createdAt: '2026-06-05T10:00:00.000Z',
  },
];

const seedAssignments: CourseAssignment[] = [
  {
    id: 'assign-esilv-ai',
    courseId: 'course-ai-foundations',
    organizationId: 'org-esilv',
    assignedAt: '2026-06-10T09:00:00.000Z',
    assignedByUserId: PLATFORM_ADMIN_ID,
  },
  {
    id: 'assign-esilv-cloud',
    courseId: 'course-cloud-devsecops',
    organizationId: 'org-esilv',
    cohortId: 'cohort-esilv-m2-cyber-cloud',
    assignedAt: '2026-06-11T09:00:00.000Z',
    assignedByUserId: PLATFORM_ADMIN_ID,
    teacherUserId: 'user-esilv-teacher',
  },
  {
    id: 'assign-esilv-auto',
    courseId: 'course-secure-automation',
    organizationId: 'org-esilv',
    cohortId: 'cohort-esilv-m2-cyber-cloud',
    assignedAt: '2026-06-12T09:00:00.000Z',
    assignedByUserId: PLATFORM_ADMIN_ID,
    teacherUserId: 'user-esilv-teacher',
  },
  {
    id: 'assign-ingetis-cloud',
    courseId: 'course-cloud-devsecops',
    organizationId: 'org-ingetis',
    cohortId: 'cohort-ingetis-devops',
    assignedAt: '2026-06-12T12:00:00.000Z',
    assignedByUserId: PLATFORM_ADMIN_ID,
  },
  {
    id: 'assign-ingetis-auto',
    courseId: 'course-secure-automation',
    organizationId: 'org-ingetis',
    assignedAt: '2026-06-13T12:00:00.000Z',
    assignedByUserId: PLATFORM_ADMIN_ID,
  },
  {
    id: 'assign-psb-ai',
    courseId: 'course-ai-foundations',
    organizationId: 'org-psb',
    assignedAt: '2026-06-14T09:00:00.000Z',
    assignedByUserId: PLATFORM_ADMIN_ID,
  },
  {
    id: 'assign-psb-product',
    courseId: 'course-business-genai',
    organizationId: 'org-psb',
    cohortId: 'cohort-psb-ai-product',
    assignedAt: '2026-06-15T09:00:00.000Z',
    assignedByUserId: PLATFORM_ADMIN_ID,
  },
  {
    id: 'assign-psb-data',
    courseId: 'course-data-literacy',
    organizationId: 'org-psb',
    assignedAt: '2026-06-16T09:00:00.000Z',
    assignedByUserId: PLATFORM_ADMIN_ID,
  },
];

const seedStudents: Student[] = [
  {
    id: 'student-esilv-1',
    organizationId: 'org-esilv',
    cohortId: 'cohort-esilv-m2-cyber-cloud',
    name: 'Amina Laurent',
    email: 'amina.laurent@esilv.example',
    externalStudentId: 'ESILV-2026-001',
    academicYear: '2026-2027',
    programName: 'Cybersecurity and Cloud Computing',
    createdAt: '2026-06-14T09:00:00.000Z',
    updatedAt: SEED_NOW,
  },
  {
    id: 'student-esilv-2',
    organizationId: 'org-esilv',
    cohortId: 'cohort-esilv-m2-cyber-cloud',
    name: 'Nolan Bernard',
    email: 'nolan.bernard@esilv.example',
    externalStudentId: 'ESILV-2026-002',
    academicYear: '2026-2027',
    programName: 'Cybersecurity and Cloud Computing',
    createdAt: '2026-06-14T09:10:00.000Z',
    updatedAt: SEED_NOW,
  },
  {
    id: 'student-ingetis-1',
    organizationId: 'org-ingetis',
    cohortId: 'cohort-ingetis-devops',
    name: 'Sarah Moreau',
    email: 'sarah.moreau@ingetis.example',
    externalStudentId: 'ING-DEVOPS-01',
    academicYear: '2026',
    programName: 'Cloud Infrastructure',
    createdAt: '2026-06-18T09:00:00.000Z',
    updatedAt: SEED_NOW,
  },
  {
    id: 'student-psb-1',
    organizationId: 'org-psb',
    cohortId: 'cohort-psb-ai-product',
    name: 'Lucas Martin',
    email: 'lucas.martin@psb.example',
    externalStudentId: 'PSB-AI-01',
    academicYear: '2026',
    programName: 'Business and Product',
    createdAt: '2026-06-19T09:00:00.000Z',
    updatedAt: SEED_NOW,
  },
  {
    id: 'student-psb-2',
    organizationId: 'org-psb',
    name: 'Maya Singh',
    email: 'maya.singh@psb.example',
    externalStudentId: 'PSB-DATA-02',
    academicYear: '2026',
    programName: 'Business Analytics',
    createdAt: '2026-06-19T09:15:00.000Z',
    updatedAt: SEED_NOW,
  },
];

const seedEnrollments: Enrollment[] = [
  {
    id: 'enroll-esilv-1-cloud',
    studentId: 'student-esilv-1',
    courseId: 'course-cloud-devsecops',
    organizationId: 'org-esilv',
    accessCodeId: 'code-esilv-cloud',
    status: 'in_progress',
    progressPercentage: 62,
    startedAt: '2026-06-20T09:00:00.000Z',
    lastActivityAt: '2026-07-01T16:20:00.000Z',
  },
  {
    id: 'enroll-esilv-2-cloud',
    studentId: 'student-esilv-2',
    courseId: 'course-cloud-devsecops',
    organizationId: 'org-esilv',
    accessCodeId: 'code-esilv-cloud',
    status: 'in_progress',
    progressPercentage: 38,
    startedAt: '2026-06-21T09:00:00.000Z',
    lastActivityAt: '2026-06-30T11:00:00.000Z',
  },
  {
    id: 'enroll-ingetis-1-cloud',
    studentId: 'student-ingetis-1',
    courseId: 'course-cloud-devsecops',
    organizationId: 'org-ingetis',
    accessCodeId: 'code-ingetis-cloud',
    status: 'completed',
    progressPercentage: 100,
    startedAt: '2026-06-19T09:00:00.000Z',
    completedAt: '2026-06-29T09:00:00.000Z',
    lastActivityAt: '2026-06-29T09:00:00.000Z',
  },
  {
    id: 'enroll-psb-1-product',
    studentId: 'student-psb-1',
    courseId: 'course-business-genai',
    organizationId: 'org-psb',
    accessCodeId: 'code-psb-product',
    status: 'in_progress',
    progressPercentage: 48,
    startedAt: '2026-06-22T09:00:00.000Z',
    lastActivityAt: '2026-07-01T12:00:00.000Z',
  },
  {
    id: 'enroll-psb-2-data',
    studentId: 'student-psb-2',
    courseId: 'course-data-literacy',
    organizationId: 'org-psb',
    status: 'completed',
    progressPercentage: 100,
    startedAt: '2026-06-18T09:00:00.000Z',
    completedAt: '2026-06-28T09:00:00.000Z',
    lastActivityAt: '2026-06-28T09:00:00.000Z',
  },
];

const seedAccessCodes: AccessCode[] = [
  {
    id: 'code-esilv-ai',
    codeHash: hashAccessCode('ESILV-AI-2026'),
    organizationId: 'org-esilv',
    courseId: 'course-ai-foundations',
    createdByUserId: 'user-esilv-admin',
    currentUses: 12,
    maxUses: 250,
    expiresAt: '2027-09-01T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-06-10T10:00:00.000Z',
  },
  {
    id: 'code-esilv-cloud',
    codeHash: hashAccessCode('ESILV-CLOUD-M2'),
    organizationId: 'org-esilv',
    courseId: 'course-cloud-devsecops',
    cohortId: 'cohort-esilv-m2-cyber-cloud',
    createdByUserId: 'user-esilv-admin',
    currentUses: 18,
    maxUses: 90,
    expiresAt: '2027-09-01T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-06-11T10:00:00.000Z',
  },
  {
    id: 'code-ingetis-cloud',
    codeHash: hashAccessCode('INGETIS-CLOUD'),
    organizationId: 'org-ingetis',
    courseId: 'course-cloud-devsecops',
    cohortId: 'cohort-ingetis-devops',
    createdByUserId: 'user-ingetis-admin',
    currentUses: 7,
    maxUses: 120,
    expiresAt: '2027-09-01T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-06-12T10:00:00.000Z',
  },
  {
    id: 'code-psb-product',
    codeHash: hashAccessCode('PSB-GENAI'),
    organizationId: 'org-psb',
    courseId: 'course-business-genai',
    cohortId: 'cohort-psb-ai-product',
    createdByUserId: 'user-psb-admin',
    currentUses: 4,
    maxUses: 160,
    expiresAt: '2027-09-01T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-06-15T10:00:00.000Z',
  },
  {
    id: 'code-expired-demo',
    codeHash: hashAccessCode('EXPIRED-COURSE'),
    organizationId: 'org-esilv',
    courseId: 'course-ai-foundations',
    createdByUserId: 'user-esilv-admin',
    currentUses: 0,
    maxUses: 10,
    expiresAt: '2025-09-01T00:00:00.000Z',
    isActive: true,
    createdAt: '2025-06-01T10:00:00.000Z',
  },
];

const seedActivityLogs: ActivityLog[] = [
  {
    id: 'activity-esilv-1',
    organizationId: 'org-esilv',
    studentId: 'student-esilv-1',
    courseId: 'course-cloud-devsecops',
    action: 'module.completed',
    metadata: { moduleId: 'module-cloud-1', progressPercentage: 62 },
    createdAt: '2026-07-01T16:20:00.000Z',
  },
  {
    id: 'activity-esilv-2',
    organizationId: 'org-esilv',
    studentId: 'student-esilv-2',
    courseId: 'course-cloud-devsecops',
    action: 'lesson.viewed',
    metadata: { moduleId: 'module-cloud-2', progressPercentage: 38 },
    createdAt: '2026-06-30T11:00:00.000Z',
  },
  {
    id: 'activity-ingetis-1',
    organizationId: 'org-ingetis',
    studentId: 'student-ingetis-1',
    courseId: 'course-cloud-devsecops',
    action: 'course.completed',
    metadata: { progressPercentage: 100 },
    createdAt: '2026-06-29T09:00:00.000Z',
  },
  {
    id: 'activity-psb-1',
    organizationId: 'org-psb',
    studentId: 'student-psb-1',
    courseId: 'course-business-genai',
    action: 'lesson.viewed',
    metadata: { moduleId: 'module-product-2', progressPercentage: 48 },
    createdAt: '2026-07-01T12:00:00.000Z',
  },
];

const seedDataset: CoursePortalDataset = {
  organizations: seedOrganizations,
  users: seedUsers,
  courses: seedCourses,
  assignments: seedAssignments,
  students: seedStudents,
  enrollments: seedEnrollments,
  accessCodes: seedAccessCodes,
  cohorts: seedCohorts,
  activityLogs: seedActivityLogs,
};

function legacyOrganizationId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('uni-')) return value.replace('uni-', 'org-');
  return value;
}

function normalizeDataset(
  parsed: Partial<CoursePortalDataset> & { universities?: University[] },
): CoursePortalDataset {
  const organizations = Array.isArray(parsed.organizations)
    ? parsed.organizations
    : Array.isArray(parsed.universities)
      ? parsed.universities.map((university) => ({
          ...university,
          id: legacyOrganizationId(university.id) || university.id,
          contactEmail: university.contactEmail || `admin@${university.slug}.example`,
          createdAt: university.createdAt || SEED_NOW,
          updatedAt: university.updatedAt || SEED_NOW,
        }))
      : [];

  return {
    organizations,
    users: Array.isArray(parsed.users) ? parsed.users : [],
    courses: Array.isArray(parsed.courses) ? parsed.courses : [],
    assignments: Array.isArray(parsed.assignments)
      ? parsed.assignments.map((assignment) => ({
          ...assignment,
          organizationId:
            assignment.organizationId ||
            legacyOrganizationId(
              (assignment as CourseAssignment & { universityId?: string }).universityId,
            ) ||
            '',
          assignedAt: assignment.assignedAt || SEED_NOW,
          assignedByUserId: assignment.assignedByUserId || PLATFORM_ADMIN_ID,
        }))
      : [],
    students: Array.isArray(parsed.students) ? parsed.students : [],
    enrollments: Array.isArray(parsed.enrollments) ? parsed.enrollments : [],
    accessCodes: Array.isArray(parsed.accessCodes)
      ? parsed.accessCodes.map((accessCode) => {
          const legacy = accessCode as AccessCode & { code?: string; universityId?: string };
          return {
            ...accessCode,
            codeHash: accessCode.codeHash || (legacy.code ? hashAccessCode(legacy.code) : ''),
            organizationId:
              accessCode.organizationId || legacyOrganizationId(legacy.universityId) || '',
            createdByUserId: accessCode.createdByUserId || PLATFORM_ADMIN_ID,
            createdAt: accessCode.createdAt || SEED_NOW,
          };
        })
      : [],
    cohorts: Array.isArray(parsed.cohorts) ? parsed.cohorts : [],
    activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : [],
  };
}

async function readDataset(): Promise<CoursePortalDataset> {
  try {
    const raw = await fs.readFile(COURSE_PORTAL_DATA_FILE, 'utf-8');
    return normalizeDataset(JSON.parse(raw) as Partial<CoursePortalDataset>);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return cloneDataset(seedDataset);
    }
    throw error;
  }
}

async function writeDataset(dataset: CoursePortalDataset): Promise<void> {
  await fs.mkdir(path.dirname(COURSE_PORTAL_DATA_FILE), { recursive: true });
  await fs.writeFile(COURSE_PORTAL_DATA_FILE, `${JSON.stringify(dataset, null, 2)}\n`, 'utf-8');
}

function findOrganization(
  dataset: CoursePortalDataset,
  value: string | undefined,
): Organization | undefined {
  if (!value) return undefined;
  const normalized = legacyOrganizationId(value) || value;
  return dataset.organizations.find(
    (organization) => organization.id === normalized || organization.slug === normalized,
  );
}

function findCourse(dataset: CoursePortalDataset, value: string | undefined): Course | undefined {
  if (!value) return undefined;
  return dataset.courses.find((course) => course.id === value || course.slug === value);
}

function courseCompletionRate(
  dataset: CoursePortalDataset,
  organizationId: string,
  courseId: string,
): number {
  const enrollments = dataset.enrollments.filter(
    (enrollment) =>
      enrollment.organizationId === organizationId && enrollment.courseId === courseId,
  );
  if (enrollments.length === 0) return 0;
  const total = enrollments.reduce((sum, enrollment) => sum + enrollment.progressPercentage, 0);
  return Math.round(total / enrollments.length);
}

function toAccessCodeView(dataset: CoursePortalDataset, accessCode: AccessCode): AccessCodeView {
  const course = dataset.courses.find((item) => item.id === accessCode.courseId);
  const organization = dataset.organizations.find((item) => item.id === accessCode.organizationId);
  const createdBy = dataset.users.find((item) => item.id === accessCode.createdByUserId);
  const cohort = accessCode.cohortId
    ? dataset.cohorts.find(
        (item) =>
          item.id === accessCode.cohortId && item.organizationId === accessCode.organizationId,
      )
    : undefined;
  const student = accessCode.studentId
    ? dataset.students.find((item) => item.id === accessCode.studentId)
    : undefined;

  return {
    id: accessCode.id,
    organizationId: accessCode.organizationId,
    courseId: accessCode.courseId,
    cohortId: accessCode.cohortId,
    studentId: accessCode.studentId,
    createdByUserId: accessCode.createdByUserId,
    expiresAt: accessCode.expiresAt,
    maxUses: accessCode.maxUses,
    currentUses: accessCode.currentUses,
    isActive: accessCode.isActive,
    createdAt: accessCode.createdAt,
    disabledAt: accessCode.disabledAt,
    courseTitle: course?.title || 'Unknown course',
    organizationName: organization?.name || 'Unknown organization',
    createdByName: createdBy?.name || 'Unknown user',
    cohortName: cohort?.name,
    cohortAcademicYear: cohort?.academicYear,
    cohortProgramName: cohort?.programName,
    studentName: student?.name,
  };
}

function assignmentToCard(
  dataset: CoursePortalDataset,
  assignment: CourseAssignment,
): CoursePortalCardData | null {
  const course = dataset.courses.find((item) => item.id === assignment.courseId);
  const organization = dataset.organizations.find((item) => item.id === assignment.organizationId);
  if (!course || !organization) return null;

  const enrollments = dataset.enrollments.filter(
    (enrollment) =>
      enrollment.organizationId === organization.id && enrollment.courseId === course.id,
  );
  const card: CoursePortalCardData = {
    assignmentId: assignment.id,
    course,
    university: organization,
    enrolledStudents: enrollments.length,
    completionRate: courseCompletionRate(dataset, organization.id, course.id),
  };
  if (assignment.cohortId) card.cohortId = assignment.cohortId;
  return card;
}

function visibleAssignmentsForUser(
  dataset: CoursePortalDataset,
  user: PortalUser,
  organizationId: string,
): CourseAssignment[] {
  const organizationAssignments = dataset.assignments.filter(
    (assignment) => assignment.organizationId === organizationId,
  );

  if (user.role === 'platform-admin' || user.role === 'organization-admin') {
    return organizationAssignments;
  }

  if (user.role === 'teacher-manager') {
    return organizationAssignments.filter((assignment) => assignment.teacherUserId === user.id);
  }

  if (user.role === 'student' && user.studentId) {
    const enrolledCourseIds = new Set(
      dataset.enrollments
        .filter(
          (enrollment) =>
            enrollment.organizationId === organizationId && enrollment.studentId === user.studentId,
        )
        .map((enrollment) => enrollment.courseId),
    );
    return organizationAssignments.filter((assignment) =>
      enrolledCourseIds.has(assignment.courseId),
    );
  }

  return [];
}

function studentSummaryFromEnrollments(
  dataset: CoursePortalDataset,
  student: Student,
  enrollments: Enrollment[],
): StudentManagementSummary {
  const averageProgress =
    enrollments.length > 0
      ? Math.round(
          enrollments.reduce((sum, enrollment) => sum + enrollment.progressPercentage, 0) /
            enrollments.length,
        )
      : 0;
  const lastActivityAt = enrollments
    .map(
      (enrollment) => enrollment.lastActivityAt || enrollment.completedAt || enrollment.startedAt,
    )
    .filter(Boolean)
    .sort()
    .at(-1);
  const accessCodeIds = enrollments
    .map((enrollment) => enrollment.accessCodeId)
    .filter((value): value is string => Boolean(value));
  const completionStatus =
    enrollments.length > 0 && enrollments.every((enrollment) => enrollment.status === 'completed')
      ? 'completed'
      : enrollments.some((enrollment) => enrollment.progressPercentage > 0)
        ? 'in_progress'
        : 'not_started';

  const accessCodeUsed = accessCodeIds
    .map((accessCodeId) => dataset.accessCodes.find((code) => code.id === accessCodeId)?.id)
    .filter(Boolean)
    .join(', ');

  return {
    student,
    coursesEnrolled: enrollments.length,
    averageProgress,
    lastActivityAt,
    accessCodeUsed: accessCodeUsed || undefined,
    completionStatus,
  };
}

export async function getCoursePortalDataset(): Promise<CoursePortalDataset> {
  return readDataset();
}

export async function listOrganizations(): Promise<Organization[]> {
  const dataset = await readDataset();
  return dataset.organizations;
}

export async function listUniversities(): Promise<University[]> {
  return listOrganizations();
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
  const dataset = await readDataset();
  return dataset.organizations.find((organization) => organization.slug === slug);
}

export async function getOrganizationById(id: string): Promise<Organization | undefined> {
  const dataset = await readDataset();
  return dataset.organizations.find((organization) => organization.id === id);
}

export async function getUniversityBySlug(slug: string): Promise<University | undefined> {
  return getOrganizationBySlug(slug);
}

export async function getCourseBySlug(slug: string): Promise<Course | undefined> {
  const dataset = await readDataset();
  return dataset.courses.find((course) => course.slug === slug);
}

export async function getPortalUserByEmail(email: string): Promise<PortalUser | undefined> {
  const dataset = await readDataset();
  return dataset.users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase());
}

export async function getPortalUserById(id: string): Promise<PortalUser | undefined> {
  const dataset = await readDataset();
  return dataset.users.find((user) => user.id === id);
}

export async function listPortalUsers(): Promise<PortalUser[]> {
  const dataset = await readDataset();
  return dataset.users;
}

export async function updateOrganizationSettings(params: {
  organizationId: string;
  name?: string;
  logoUrl?: string;
  description?: string;
  contactEmail?: string;
  welcomeMessage?: string;
}): Promise<Organization | { error: string }> {
  const dataset = await readDataset();
  const organization = dataset.organizations.find((item) => item.id === params.organizationId);
  if (!organization) return { error: 'Organization not found.' };

  const name = params.name?.trim();
  const contactEmail = params.contactEmail?.trim();
  const logoUrl = params.logoUrl?.trim();
  const description = params.description?.trim();
  const welcomeMessage = params.welcomeMessage?.trim();

  if (params.name !== undefined && !name) return { error: 'Organization name is required.' };
  if (params.contactEmail !== undefined && !contactEmail) {
    return { error: 'Contact email is required.' };
  }
  if (params.description !== undefined && !description) {
    return { error: 'Organization description is required.' };
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { error: 'Contact email must be valid.' };
  }

  if (name) organization.name = name;
  if (params.logoUrl !== undefined) organization.logoUrl = logoUrl || undefined;
  if (description) organization.description = description;
  if (contactEmail) organization.contactEmail = contactEmail;
  if (params.welcomeMessage !== undefined) {
    organization.welcomeMessage = welcomeMessage || undefined;
  }
  organization.updatedAt = new Date().toISOString();

  await writeDataset(dataset);
  return organization;
}

export async function listCoursePortalCards(
  params: {
    universityId?: string;
    organizationId?: string;
  } = {},
): Promise<CoursePortalCardData[]> {
  const dataset = await readDataset();
  const organizationId = legacyOrganizationId(params.organizationId || params.universityId);
  return dataset.assignments
    .filter((assignment) => !organizationId || assignment.organizationId === organizationId)
    .map((assignment) => assignmentToCard(dataset, assignment))
    .filter((item): item is CoursePortalCardData => Boolean(item));
}

export async function listOrganizationCourseSummaries(
  organizationId: string,
): Promise<OrganizationCourseSummary[]> {
  const dataset = await readDataset();
  const organization = dataset.organizations.find((item) => item.id === organizationId);
  if (!organization) return [];

  return dataset.assignments
    .filter((assignment) => assignment.organizationId === organizationId)
    .map((assignment) => assignmentToCard(dataset, assignment))
    .filter((item): item is CoursePortalCardData => Boolean(item))
    .map((card) => ({
      ...card,
      organization,
      activeAccessCodes: dataset.accessCodes.filter(
        (code) =>
          code.organizationId === organizationId &&
          code.courseId === card.course.id &&
          code.isActive &&
          (!code.expiresAt || new Date(code.expiresAt).getTime() >= Date.now()),
      ).length,
    }));
}

export async function listVisibleOrganizationCourseSummaries(
  user: PortalUser,
  organizationId: string,
): Promise<OrganizationCourseSummary[]> {
  const dataset = await readDataset();
  const organization = dataset.organizations.find((item) => item.id === organizationId);
  if (!organization) return [];

  return visibleAssignmentsForUser(dataset, user, organizationId)
    .map((assignment) => assignmentToCard(dataset, assignment))
    .filter((item): item is CoursePortalCardData => Boolean(item))
    .map((card) => ({
      ...card,
      organization,
      activeAccessCodes: dataset.accessCodes.filter(
        (code) =>
          code.organizationId === organizationId &&
          code.courseId === card.course.id &&
          code.isActive &&
          (!code.expiresAt || new Date(code.expiresAt).getTime() >= Date.now()),
      ).length,
    }));
}

export async function getOrganizationDashboardSummary(
  organizationId: string,
): Promise<OrganizationDashboardSummary | undefined> {
  const dataset = await readDataset();
  const organization = dataset.organizations.find((item) => item.id === organizationId);
  if (!organization) return undefined;

  const courses = await listOrganizationCourseSummaries(organizationId);
  const activeAccessCodes = dataset.accessCodes.filter(
    (code) =>
      code.organizationId === organizationId &&
      code.isActive &&
      (!code.expiresAt || new Date(code.expiresAt).getTime() >= Date.now()),
  ).length;
  const completionRates = courses.map((course) => course.completionRate);

  return {
    organization,
    activeCourses: courses.filter((item) => item.course.status === 'active').length,
    enrolledStudents: dataset.students.filter(
      (student) => student.organizationId === organizationId,
    ).length,
    activeAccessCodes,
    averageCompletionRate:
      completionRates.length > 0
        ? Math.round(
            completionRates.reduce((sum, value) => sum + value, 0) / completionRates.length,
          )
        : 0,
    recentActivity: dataset.activityLogs
      .filter((activity) => activity.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6),
    courses,
  };
}

export async function getVisibleOrganizationDashboardSummary(
  user: PortalUser,
  organizationId: string,
): Promise<OrganizationDashboardSummary | undefined> {
  const dataset = await readDataset();
  const organization = dataset.organizations.find((item) => item.id === organizationId);
  if (!organization) return undefined;

  const visibleAssignments = visibleAssignmentsForUser(dataset, user, organizationId);
  const visibleCourseIds = new Set(visibleAssignments.map((assignment) => assignment.courseId));
  const visibleStudentIds =
    user.role === 'student' && user.studentId
      ? new Set([user.studentId])
      : new Set(
          dataset.enrollments
            .filter(
              (enrollment) =>
                enrollment.organizationId === organizationId &&
                visibleCourseIds.has(enrollment.courseId),
            )
            .map((enrollment) => enrollment.studentId),
        );
  const courses = await listVisibleOrganizationCourseSummaries(user, organizationId);
  const completionRates = courses.map((course) => course.completionRate);

  return {
    organization,
    activeCourses: courses.filter((item) => item.course.status === 'active').length,
    enrolledStudents: dataset.students.filter(
      (student) => student.organizationId === organizationId && visibleStudentIds.has(student.id),
    ).length,
    activeAccessCodes:
      user.role === 'student'
        ? 0
        : dataset.accessCodes.filter(
            (code) =>
              code.organizationId === organizationId &&
              visibleCourseIds.has(code.courseId) &&
              code.isActive &&
              (!code.expiresAt || new Date(code.expiresAt).getTime() >= Date.now()),
          ).length,
    averageCompletionRate:
      completionRates.length > 0
        ? Math.round(
            completionRates.reduce((sum, value) => sum + value, 0) / completionRates.length,
          )
        : 0,
    recentActivity: dataset.activityLogs
      .filter((activity) => {
        if (activity.organizationId !== organizationId) return false;
        if (activity.courseId && !visibleCourseIds.has(activity.courseId)) return false;
        if (user.role === 'student' && activity.studentId !== user.studentId) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6),
    courses,
  };
}

export async function getCourseDetailContext(params: {
  courseSlug: string;
  universitySlug?: string;
  organizationSlug?: string;
}): Promise<
  | {
      course: Course;
      university: University;
      organization: Organization;
      assignment: CourseAssignment;
    }
  | undefined
> {
  const dataset = await readDataset();
  const course = dataset.courses.find((item) => item.slug === params.courseSlug);
  if (!course) return undefined;

  const requestedSlug = params.organizationSlug || params.universitySlug;
  const organization = requestedSlug
    ? dataset.organizations.find((item) => item.slug === requestedSlug)
    : undefined;
  if (requestedSlug && !organization) return undefined;

  const assignments = dataset.assignments.filter((item) => item.courseId === course.id);
  const assignment = organization
    ? assignments.find((item) => item.organizationId === organization.id)
    : assignments[0];
  const resolvedOrganization =
    organization || dataset.organizations.find((item) => item.id === assignment?.organizationId);

  if (!assignment || !resolvedOrganization) return undefined;
  return {
    course,
    university: resolvedOrganization,
    organization: resolvedOrganization,
    assignment,
  };
}

export async function getOrganizationCourseDetail(
  organizationId: string,
  courseIdOrSlug: string,
): Promise<
  | {
      organization: Organization;
      course: Course;
      assignment: CourseAssignment;
      enrollments: Enrollment[];
      students: Student[];
      accessCodes: AccessCodeView[];
      completionRate: number;
    }
  | undefined
> {
  const dataset = await readDataset();
  const organization = dataset.organizations.find((item) => item.id === organizationId);
  const course = findCourse(dataset, courseIdOrSlug);
  if (!organization || !course) return undefined;

  const assignment = dataset.assignments.find(
    (item) => item.organizationId === organizationId && item.courseId === course.id,
  );
  if (!assignment) return undefined;

  const enrollments = dataset.enrollments.filter(
    (enrollment) =>
      enrollment.organizationId === organizationId && enrollment.courseId === course.id,
  );
  const studentIds = new Set(enrollments.map((enrollment) => enrollment.studentId));

  return {
    organization,
    course,
    assignment,
    enrollments,
    students: dataset.students.filter((student) => studentIds.has(student.id)),
    accessCodes: dataset.accessCodes
      .filter((code) => code.organizationId === organizationId && code.courseId === course.id)
      .map((code) => toAccessCodeView(dataset, code)),
    completionRate: courseCompletionRate(dataset, organizationId, course.id),
  };
}

export async function getVisibleOrganizationCourseDetail(
  user: PortalUser,
  organizationId: string,
  courseIdOrSlug: string,
): Promise<Awaited<ReturnType<typeof getOrganizationCourseDetail>>> {
  const dataset = await readDataset();
  const course = findCourse(dataset, courseIdOrSlug);
  if (!course) return undefined;
  const visibleAssignments = visibleAssignmentsForUser(dataset, user, organizationId);
  if (!visibleAssignments.some((assignment) => assignment.courseId === course.id)) return undefined;
  const detail = await getOrganizationCourseDetail(organizationId, course.id);
  if (!detail || user.role !== 'student') return detail;

  const enrollments = detail.enrollments.filter(
    (enrollment) => enrollment.studentId === user.studentId,
  );
  const studentIds = new Set(enrollments.map((enrollment) => enrollment.studentId));
  return {
    ...detail,
    enrollments,
    students: detail.students.filter((student) => studentIds.has(student.id)),
  };
}

export async function hasPortalAccountCourseAccess(
  user: PortalUser,
  params: {
    organizationId: string;
    courseId: string;
    cohortId?: string;
  },
): Promise<boolean> {
  if (user.role !== 'student' || user.organizationId !== params.organizationId || !user.studentId) {
    return false;
  }

  const dataset = await readDataset();
  const student = dataset.students.find(
    (item) => item.id === user.studentId && item.organizationId === params.organizationId,
  );
  if (!student) return false;

  const assignment = dataset.assignments.find(
    (item) =>
      item.organizationId === params.organizationId &&
      item.courseId === params.courseId &&
      item.cohortId === params.cohortId,
  );
  if (!assignment) return false;
  if (assignment.cohortId && student.cohortId !== assignment.cohortId) return false;

  return dataset.enrollments.some(
    (enrollment) =>
      enrollment.organizationId === params.organizationId &&
      enrollment.courseId === params.courseId &&
      enrollment.studentId === student.id,
  );
}

export async function listOrganizationStudents(organizationId: string): Promise<Student[]> {
  const dataset = await readDataset();
  return dataset.students.filter((student) => student.organizationId === organizationId);
}

export async function listVisibleOrganizationStudentSummaries(
  user: PortalUser,
  organizationId: string,
): Promise<StudentManagementSummary[]> {
  const dataset = await readDataset();
  const visibleAssignments = visibleAssignmentsForUser(dataset, user, organizationId);
  const visibleCourseIds = new Set(visibleAssignments.map((assignment) => assignment.courseId));

  if (user.role === 'student') {
    const student = user.studentId
      ? dataset.students.find(
          (item) => item.id === user.studentId && item.organizationId === organizationId,
        )
      : undefined;
    if (!student) return [];
    const enrollments = dataset.enrollments.filter(
      (enrollment) =>
        enrollment.organizationId === organizationId &&
        enrollment.studentId === student.id &&
        visibleCourseIds.has(enrollment.courseId),
    );
    return [studentSummaryFromEnrollments(dataset, student, enrollments)];
  }

  const studentIds = new Set(
    dataset.enrollments
      .filter(
        (enrollment) =>
          enrollment.organizationId === organizationId && visibleCourseIds.has(enrollment.courseId),
      )
      .map((enrollment) => enrollment.studentId),
  );

  return dataset.students
    .filter((student) => student.organizationId === organizationId && studentIds.has(student.id))
    .map((student) => {
      const enrollments = dataset.enrollments.filter(
        (enrollment) =>
          enrollment.organizationId === organizationId &&
          enrollment.studentId === student.id &&
          visibleCourseIds.has(enrollment.courseId),
      );
      return studentSummaryFromEnrollments(dataset, student, enrollments);
    });
}

export async function getOrganizationStudentDetail(
  organizationId: string,
  studentId: string,
): Promise<
  | {
      student: Student;
      organization: Organization;
      progress: StudentCourseProgress[];
      activity: ActivityLog[];
    }
  | undefined
> {
  const dataset = await readDataset();
  const organization = dataset.organizations.find((item) => item.id === organizationId);
  const student = dataset.students.find(
    (item) => item.id === studentId && item.organizationId === organizationId,
  );
  if (!organization || !student) return undefined;

  const progress = dataset.assignments
    .filter((assignment) => assignment.organizationId === organizationId)
    .map((assignment): StudentCourseProgress | null => {
      const course = dataset.courses.find((item) => item.id === assignment.courseId);
      if (!course) return null;
      const enrollment = dataset.enrollments.find(
        (item) =>
          item.organizationId === organizationId &&
          item.courseId === course.id &&
          item.studentId === student.id,
      );
      const accessCode = enrollment?.accessCodeId
        ? dataset.accessCodes.find((code) => code.id === enrollment.accessCodeId)
        : undefined;
      return {
        course,
        enrollment,
        accessCode: accessCode ? toAccessCodeView(dataset, accessCode) : undefined,
      };
    })
    .filter((item): item is StudentCourseProgress => Boolean(item));

  return {
    student,
    organization,
    progress,
    activity: dataset.activityLogs
      .filter(
        (activity) =>
          activity.organizationId === organizationId && activity.studentId === student.id,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function getVisibleOrganizationStudentDetail(
  user: PortalUser,
  organizationId: string,
  studentId: string,
): Promise<Awaited<ReturnType<typeof getOrganizationStudentDetail>>> {
  if (user.role === 'student' && user.studentId !== studentId) return undefined;
  const dataset = await readDataset();
  const visibleAssignments = visibleAssignmentsForUser(dataset, user, organizationId);
  const visibleCourseIds = new Set(visibleAssignments.map((assignment) => assignment.courseId));
  const hasVisibleEnrollment = dataset.enrollments.some(
    (enrollment) =>
      enrollment.organizationId === organizationId &&
      enrollment.studentId === studentId &&
      visibleCourseIds.has(enrollment.courseId),
  );
  if (!hasVisibleEnrollment) return undefined;
  return getOrganizationStudentDetail(organizationId, studentId);
}

export async function listOrganizationAccessCodes(
  organizationId: string,
): Promise<AccessCodeView[]> {
  const dataset = await readDataset();
  return dataset.accessCodes
    .filter((accessCode) => accessCode.organizationId === organizationId)
    .map((accessCode) => toAccessCodeView(dataset, accessCode))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listOrganizationCohorts(organizationId: string): Promise<Cohort[]> {
  const dataset = await readDataset();
  return dataset.cohorts
    .filter((cohort) => cohort.organizationId === organizationId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createOrganizationAccessCode(params: {
  organizationId: string;
  courseId: string;
  cohortId?: string;
  studentId?: string;
  createdByUserId: string;
  expiresAt?: string;
  maxUses?: number;
}): Promise<{ accessCode: AccessCodeView; code: string } | { error: string }> {
  const dataset = await readDataset();
  const organization = dataset.organizations.find((item) => item.id === params.organizationId);
  const course = dataset.courses.find((item) => item.id === params.courseId);
  const assignments = dataset.assignments.filter(
    (item) => item.organizationId === params.organizationId && item.courseId === params.courseId,
  );
  const creator = dataset.users.find((item) => item.id === params.createdByUserId);
  const cohort = params.cohortId
    ? dataset.cohorts.find(
        (item) => item.id === params.cohortId && item.organizationId === params.organizationId,
      )
    : undefined;
  const assignment = params.cohortId
    ? assignments.find((item) => item.cohortId === params.cohortId)
    : assignments[0];
  const student = params.studentId
    ? dataset.students.find(
        (item) => item.id === params.studentId && item.organizationId === params.organizationId,
      )
    : undefined;

  if (!organization || !course || assignments.length === 0)
    return { error: 'Course is not assigned to this organization.' };
  if (!creator) return { error: 'Access-code creator was not found.' };
  if (params.cohortId && !cohort) return { error: 'Cohort does not belong to this organization.' };
  if (!assignment) return { error: 'Selected cohort is not assigned to this course.' };
  if (params.studentId && !student)
    return { error: 'Student does not belong to this organization.' };

  const code = `${organization.slug.toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  const record: AccessCode = {
    id: `code-${Date.now()}-${randomBytes(3).toString('hex')}`,
    codeHash: hashAccessCode(code),
    organizationId: organization.id,
    courseId: course.id,
    cohortId: params.cohortId || assignment.cohortId,
    studentId: params.studentId,
    createdByUserId: creator.id,
    expiresAt: params.expiresAt || undefined,
    maxUses: params.maxUses,
    currentUses: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  dataset.accessCodes.push(record);
  await writeDataset(dataset);
  return { accessCode: toAccessCodeView(dataset, record), code };
}

export async function assignCourseToOrganization(params: {
  organizationId: string;
  courseId: string;
  cohortId?: string;
  assignedByUserId: string;
}): Promise<CourseAssignment | { error: string }> {
  const dataset = await readDataset();
  const organization = dataset.organizations.find((item) => item.id === params.organizationId);
  const course = dataset.courses.find((item) => item.id === params.courseId);
  const assignedBy = dataset.users.find((item) => item.id === params.assignedByUserId);

  if (!organization) return { error: 'Organization not found.' };
  if (!course) return { error: 'Course not found.' };
  if (!assignedBy) return { error: 'Assigning user not found.' };

  const existing = dataset.assignments.find(
    (item) =>
      item.organizationId === organization.id &&
      item.courseId === course.id &&
      item.cohortId === params.cohortId,
  );
  if (existing) return existing;

  if (params.cohortId) {
    const cohort = dataset.cohorts.find(
      (item) => item.id === params.cohortId && item.organizationId === organization.id,
    );
    if (!cohort) return { error: 'Cohort does not belong to this organization.' };
  }

  const assignment: CourseAssignment = {
    id: `assign-${Date.now()}-${randomBytes(3).toString('hex')}`,
    organizationId: organization.id,
    courseId: course.id,
    cohortId: params.cohortId,
    assignedAt: new Date().toISOString(),
    assignedByUserId: assignedBy.id,
  };

  dataset.assignments.push(assignment);
  await writeDataset(dataset);
  return assignment;
}

export async function disableOrganizationAccessCode(params: {
  organizationId: string;
  accessCodeId: string;
}): Promise<AccessCodeView | undefined> {
  const dataset = await readDataset();
  const accessCode = dataset.accessCodes.find(
    (item) => item.id === params.accessCodeId && item.organizationId === params.organizationId,
  );
  if (!accessCode) return undefined;

  accessCode.isActive = false;
  accessCode.disabledAt = new Date().toISOString();
  await writeDataset(dataset);
  return toAccessCodeView(dataset, accessCode);
}

export async function validateCourseAccessGrant(
  input: CourseAccessValidationInput,
): Promise<
  | { valid: true; grant: CourseAccessGrant }
  | { valid: false; reason: CourseAccessInvalidReason; message: string }
> {
  const organizationRef = input.organizationId || input.organizationSlug || input.universityId;
  const courseRef = input.courseId || input.courseSlug;
  const enteredCode = input.accessCode?.trim();

  if (!organizationRef || !courseRef || !enteredCode) {
    return {
      valid: false,
      reason: 'missing-fields',
      message: 'Organization, course, and access code are required.',
    };
  }

  const dataset = await readDataset();
  const organization = findOrganization(dataset, organizationRef);
  if (!organization) {
    return { valid: false, reason: 'organization-not-found', message: 'Organization not found.' };
  }

  const course = findCourse(dataset, courseRef);
  if (!course) {
    return { valid: false, reason: 'course-not-found', message: 'Course not found.' };
  }

  const assignments = dataset.assignments.filter(
    (item) => item.courseId === course.id && item.organizationId === organization.id,
  );
  if (assignments.length === 0) {
    return {
      valid: false,
      reason: 'course-not-assigned',
      message: 'This course is not assigned to the selected organization or cohort.',
    };
  }

  const codeHash = hashAccessCode(enteredCode);
  const code = dataset.accessCodes.find((item) => item.codeHash === codeHash);
  if (!code) {
    return {
      valid: false,
      reason: 'invalid-code',
      message: 'The access code is not valid for this course.',
    };
  }

  if (
    code.courseId !== course.id ||
    code.organizationId !== organization.id ||
    (code.studentId && input.studentId && code.studentId !== input.studentId)
  ) {
    return {
      valid: false,
      reason: 'code-not-linked',
      message: 'This code is not linked to the selected course and organization.',
    };
  }

  const assignment = assignments.find(
    (item) =>
      item.cohortId === code.cohortId && (input.cohortId ? item.cohortId === input.cohortId : true),
  );
  if (!assignment) {
    return {
      valid: false,
      reason: 'course-not-assigned',
      message: 'This course is not assigned to the selected organization or cohort.',
    };
  }

  if (code.cohortId !== assignment.cohortId) {
    return {
      valid: false,
      reason: 'code-not-linked',
      message: 'This code is not linked to the selected course and organization.',
    };
  }

  if (!code.isActive) {
    return {
      valid: false,
      reason: 'code-inactive',
      message: 'This access code is no longer active.',
    };
  }

  if (code.expiresAt && new Date(code.expiresAt).getTime() < Date.now()) {
    return { valid: false, reason: 'code-expired', message: 'This access code has expired.' };
  }

  if (code.maxUses !== undefined && code.currentUses >= code.maxUses) {
    return {
      valid: false,
      reason: 'usage-limit-reached',
      message: 'This access code has reached its usage limit.',
    };
  }

  const enrollment =
    input.studentId || code.studentId
      ? dataset.enrollments.find(
          (item) =>
            item.organizationId === organization.id &&
            item.courseId === course.id &&
            item.studentId === (input.studentId || code.studentId),
        )
      : undefined;

  return {
    valid: true,
    grant: {
      course,
      organization,
      university: organization,
      assignment,
      accessCode: code,
      enrollment,
    },
  };
}

export async function consumeCourseAccessGrant(
  input: CourseAccessValidationInput,
): Promise<
  | { valid: true; grant: CourseAccessGrant; accessSession: string; enrollmentId?: string }
  | { valid: false; reason: CourseAccessInvalidReason; message: string }
> {
  const result = await validateCourseAccessGrant(input);
  if (!result.valid) return result;

  const dataset = await readDataset();
  const accessCode = dataset.accessCodes.find((item) => item.id === result.grant.accessCode.id);
  if (!accessCode) {
    return {
      valid: false,
      reason: 'invalid-code',
      message: 'The access code is not valid for this course.',
    };
  }

  accessCode.currentUses += 1;
  let studentId = input.studentId || accessCode.studentId;
  let enrollment: Enrollment | undefined;

  if (!studentId) {
    const createdAt = new Date().toISOString();
    const student: Student = {
      id: `student-access-${Date.now()}-${randomBytes(3).toString('hex')}`,
      organizationId: result.grant.organization.id,
      cohortId: result.grant.assignment.cohortId,
      name: 'Access code learner',
      externalStudentId: `access-${result.grant.accessCode.id}-${Date.now()}`,
      createdAt,
      updatedAt: createdAt,
    };
    dataset.students.push(student);
    studentId = student.id;
  }

  if (studentId) {
    const student = dataset.students.find(
      (item) => item.id === studentId && item.organizationId === result.grant.organization.id,
    );
    if (student) {
      enrollment = dataset.enrollments.find(
        (item) =>
          item.organizationId === result.grant.organization.id &&
          item.courseId === result.grant.course.id &&
          item.studentId === student.id,
      );
      if (!enrollment) {
        enrollment = {
          id: `enroll-${Date.now()}-${randomBytes(3).toString('hex')}`,
          studentId: student.id,
          organizationId: result.grant.organization.id,
          courseId: result.grant.course.id,
          accessCodeId: accessCode.id,
          status: 'not_started',
          progressPercentage: 0,
          startedAt: new Date().toISOString(),
        };
        dataset.enrollments.push(enrollment);
      }
    }
  }

  dataset.activityLogs.push({
    id: `activity-${Date.now()}-${randomBytes(3).toString('hex')}`,
    organizationId: result.grant.organization.id,
    studentId,
    courseId: result.grant.course.id,
    action: 'course.access_granted',
    metadata: { accessCodeId: accessCode.id },
    createdAt: new Date().toISOString(),
  });

  await writeDataset(dataset);
  return {
    valid: true,
    grant: {
      ...result.grant,
      accessCode,
      enrollment,
    },
    accessSession: `access-${result.grant.organization.id}-${result.grant.course.id}-${Date.now()}`,
    enrollmentId: enrollment?.id,
  };
}

export async function trackStudentActivity(params: {
  organizationId: string;
  studentId?: string;
  courseId?: string;
  action: string;
  metadata?: Record<string, unknown>;
  progressPercentage?: number;
}): Promise<ActivityLog | { error: string }> {
  const dataset = await readDataset();
  const organization = dataset.organizations.find((item) => item.id === params.organizationId);
  if (!organization) return { error: 'Organization not found.' };

  if (params.studentId) {
    const student = dataset.students.find(
      (item) => item.id === params.studentId && item.organizationId === params.organizationId,
    );
    if (!student) return { error: 'Student does not belong to this organization.' };
  }

  if (params.courseId) {
    const assignment = dataset.assignments.find(
      (item) => item.courseId === params.courseId && item.organizationId === params.organizationId,
    );
    if (!assignment) return { error: 'Course is not assigned to this organization.' };
  }

  if (params.studentId && params.courseId && typeof params.progressPercentage === 'number') {
    const enrollment = dataset.enrollments.find(
      (item) =>
        item.organizationId === params.organizationId &&
        item.studentId === params.studentId &&
        item.courseId === params.courseId,
    );
    if (enrollment) {
      enrollment.progressPercentage = Math.max(0, Math.min(100, params.progressPercentage));
      enrollment.status =
        enrollment.progressPercentage >= 100
          ? 'completed'
          : enrollment.progressPercentage > 0
            ? 'in_progress'
            : 'not_started';
      enrollment.lastActivityAt = new Date().toISOString();
      if (enrollment.status === 'completed' && !enrollment.completedAt) {
        enrollment.completedAt = enrollment.lastActivityAt;
      }
    }
  }

  const activity: ActivityLog = {
    id: `activity-${Date.now()}-${randomBytes(3).toString('hex')}`,
    organizationId: params.organizationId,
    studentId: params.studentId,
    courseId: params.courseId,
    action: params.action,
    metadata: params.metadata || {},
    createdAt: new Date().toISOString(),
  };
  dataset.activityLogs.push(activity);
  await writeDataset(dataset);
  return activity;
}
