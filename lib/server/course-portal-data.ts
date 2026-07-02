import { promises as fs } from 'fs';
import path from 'path';
import type {
  AccessCode,
  Course,
  CourseAccessGrant,
  CourseAccessInvalidReason,
  CourseAccessValidationInput,
  CourseAssignment,
  CoursePortalCardData,
  CoursePortalDataset,
  University,
} from '@/lib/types/course-portal';

const COURSE_PORTAL_DATA_FILE = path.join(process.cwd(), 'data', 'course-portal', 'catalog.json');

const seedUniversities: University[] = [
  {
    id: 'uni-esilv',
    name: 'ESILV',
    slug: 'esilv',
    logoUrl: '/logo-horizontal.png',
    description:
      'Engineering and digital innovation courses prepared for cybersecurity, cloud, and AI cohorts.',
    welcomeMessage: 'Access your OpenMAIC classrooms for platform, security, and AI engineering.',
  },
  {
    id: 'uni-ingetis',
    name: 'INGETIS',
    slug: 'ingetis',
    logoUrl: '/logo-horizontal.png',
    description:
      'Professional training courses for cloud infrastructure, DevOps delivery, and applied automation.',
    welcomeMessage: 'Browse assigned courses and unlock the modules shared with your cohort.',
  },
  {
    id: 'uni-psb',
    name: 'Paris School of Business',
    slug: 'psb',
    logoUrl: '/logo-horizontal.png',
    description:
      'Business-focused AI literacy and product strategy courses generated with OpenMAIC.',
    welcomeMessage: 'Continue your assigned learning path with institution-specific access.',
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

const seedAssignments: CourseAssignment[] = [
  { id: 'assign-esilv-ai', courseId: 'course-ai-foundations', universityId: 'uni-esilv' },
  {
    id: 'assign-esilv-cloud',
    courseId: 'course-cloud-devsecops',
    universityId: 'uni-esilv',
    cohortId: 'm2-cyber-cloud',
  },
  {
    id: 'assign-esilv-auto',
    courseId: 'course-secure-automation',
    universityId: 'uni-esilv',
    cohortId: 'm2-cyber-cloud',
  },
  { id: 'assign-ingetis-cloud', courseId: 'course-cloud-devsecops', universityId: 'uni-ingetis' },
  { id: 'assign-ingetis-auto', courseId: 'course-secure-automation', universityId: 'uni-ingetis' },
  { id: 'assign-psb-ai', courseId: 'course-ai-foundations', universityId: 'uni-psb' },
  { id: 'assign-psb-product', courseId: 'course-business-genai', universityId: 'uni-psb' },
  { id: 'assign-psb-data', courseId: 'course-data-literacy', universityId: 'uni-psb' },
];

const seedAccessCodes: AccessCode[] = [
  {
    id: 'code-esilv-ai',
    code: 'ESILV-AI-2026',
    courseId: 'course-ai-foundations',
    universityId: 'uni-esilv',
    currentUses: 12,
    maxUses: 250,
    expiresAt: '2027-09-01T00:00:00.000Z',
    isActive: true,
  },
  {
    id: 'code-esilv-cloud',
    code: 'ESILV-CLOUD-M2',
    courseId: 'course-cloud-devsecops',
    universityId: 'uni-esilv',
    cohortId: 'm2-cyber-cloud',
    currentUses: 18,
    maxUses: 90,
    expiresAt: '2027-09-01T00:00:00.000Z',
    isActive: true,
  },
  {
    id: 'code-ingetis-cloud',
    code: 'INGETIS-CLOUD',
    courseId: 'course-cloud-devsecops',
    universityId: 'uni-ingetis',
    currentUses: 7,
    maxUses: 120,
    expiresAt: '2027-09-01T00:00:00.000Z',
    isActive: true,
  },
  {
    id: 'code-psb-product',
    code: 'PSB-GENAI',
    courseId: 'course-business-genai',
    universityId: 'uni-psb',
    currentUses: 4,
    maxUses: 160,
    expiresAt: '2027-09-01T00:00:00.000Z',
    isActive: true,
  },
  {
    id: 'code-expired-demo',
    code: 'EXPIRED-COURSE',
    courseId: 'course-ai-foundations',
    universityId: 'uni-esilv',
    currentUses: 0,
    maxUses: 10,
    expiresAt: '2025-09-01T00:00:00.000Z',
    isActive: true,
  },
];

const seedDataset: CoursePortalDataset = {
  universities: seedUniversities,
  courses: seedCourses,
  assignments: seedAssignments,
  accessCodes: seedAccessCodes,
};

async function readDataset(): Promise<CoursePortalDataset> {
  try {
    const raw = await fs.readFile(COURSE_PORTAL_DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<CoursePortalDataset>;
    return {
      universities: Array.isArray(parsed.universities) ? parsed.universities : [],
      courses: Array.isArray(parsed.courses) ? parsed.courses : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      accessCodes: Array.isArray(parsed.accessCodes) ? parsed.accessCodes : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return seedDataset;
    }
    throw error;
  }
}

export async function getCoursePortalDataset(): Promise<CoursePortalDataset> {
  return readDataset();
}

export async function listUniversities(): Promise<University[]> {
  const dataset = await readDataset();
  return dataset.universities;
}

export async function getUniversityBySlug(slug: string): Promise<University | undefined> {
  const dataset = await readDataset();
  return dataset.universities.find((university) => university.slug === slug);
}

export async function getCourseBySlug(slug: string): Promise<Course | undefined> {
  const dataset = await readDataset();
  return dataset.courses.find((course) => course.slug === slug);
}

export async function listCoursePortalCards(
  params: {
    universityId?: string;
  } = {},
): Promise<CoursePortalCardData[]> {
  const dataset = await readDataset();
  return dataset.assignments
    .filter((assignment) => !params.universityId || assignment.universityId === params.universityId)
    .map((assignment): CoursePortalCardData | null => {
      const course = dataset.courses.find((item) => item.id === assignment.courseId);
      const university = dataset.universities.find((item) => item.id === assignment.universityId);
      if (!course || !university) return null;
      const card: CoursePortalCardData = {
        assignmentId: assignment.id,
        course,
        university,
      };
      if (assignment.cohortId) card.cohortId = assignment.cohortId;
      return card;
    })
    .filter((item): item is CoursePortalCardData => Boolean(item));
}

export async function getCourseDetailContext(params: {
  courseSlug: string;
  universitySlug?: string;
}): Promise<
  | {
      course: Course;
      university: University;
      assignment: CourseAssignment;
    }
  | undefined
> {
  const dataset = await readDataset();
  const course = dataset.courses.find((item) => item.slug === params.courseSlug);
  if (!course) return undefined;

  const assignments = dataset.assignments.filter((item) => item.courseId === course.id);
  const university = params.universitySlug
    ? dataset.universities.find((item) => item.slug === params.universitySlug)
    : undefined;
  if (params.universitySlug && !university) return undefined;

  const assignment = university
    ? assignments.find((item) => item.universityId === university.id)
    : assignments[0];
  const resolvedUniversity =
    university || dataset.universities.find((item) => item.id === assignment?.universityId);

  if (!assignment || !resolvedUniversity) return undefined;
  return { course, university: resolvedUniversity, assignment };
}

export async function validateCourseAccessGrant(
  input: CourseAccessValidationInput,
): Promise<
  | { valid: true; grant: CourseAccessGrant }
  | { valid: false; reason: CourseAccessInvalidReason; message: string }
> {
  const courseId = input.courseId?.trim();
  const universityId = input.universityId?.trim();
  const enteredCode = input.accessCode?.trim();

  if (!courseId || !universityId || !enteredCode) {
    return {
      valid: false,
      reason: 'missing-fields',
      message: 'Course, university, and access code are required.',
    };
  }

  const dataset = await readDataset();
  const course = dataset.courses.find((item) => item.id === courseId);
  if (!course) {
    return { valid: false, reason: 'course-not-found', message: 'Course not found.' };
  }

  const university = dataset.universities.find((item) => item.id === universityId);
  if (!university) {
    return { valid: false, reason: 'university-not-found', message: 'University not found.' };
  }

  const assignment = dataset.assignments.find(
    (item) =>
      item.courseId === course.id &&
      item.universityId === university.id &&
      (input.cohortId ? item.cohortId === input.cohortId : !item.cohortId),
  );
  if (!assignment) {
    return {
      valid: false,
      reason: 'course-not-assigned',
      message: 'This course is not assigned to the selected university or cohort.',
    };
  }

  const normalizedCode = enteredCode.toUpperCase();
  const code = dataset.accessCodes.find(
    (item) => item.code.trim().toUpperCase() === normalizedCode,
  );
  if (!code) {
    return {
      valid: false,
      reason: 'invalid-code',
      message: 'The access code is not valid for this course.',
    };
  }

  if (
    code.courseId !== course.id ||
    code.universityId !== university.id ||
    code.cohortId !== assignment.cohortId
  ) {
    return {
      valid: false,
      reason: 'code-not-linked',
      message: 'This code is not linked to the selected course and university.',
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

  return {
    valid: true,
    grant: {
      course,
      university,
      assignment,
      accessCode: code,
    },
  };
}
