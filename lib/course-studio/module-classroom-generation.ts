import type { Course, CourseModule } from '@/lib/types/course-portal';
import type {
  CourseModulePlan,
  CoursePlan,
  GeneratedPortalCourseMetadata,
} from '@/lib/types/course-studio';

export interface BuildModuleClassroomGenerationRequestParams {
  coursePlan: CoursePlan;
  courseModule: CourseModulePlan;
  audience?: string;
  courseResourceIds: string[];
  attachCourse?: Course;
  publishToDashboard: boolean;
  publishOrganizationId?: string;
  publishCohortId?: string;
  enableImageGeneration: boolean;
  enableVideoGeneration: boolean;
  enableTTS: boolean;
  allowSeparateGeneratedCourseOnAttachMismatch?: boolean;
}

export interface ModuleClassroomGenerationRequest {
  requirement: string;
  courseResourceIds?: string[];
  agentMode: 'generate';
  enableVideoGeneration: boolean;
  enableImageGeneration: boolean;
  enableTTS: boolean;
  portalCourse: GeneratedPortalCourseMetadata;
  attachWarning?: string;
}

const TITLE_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'course',
  'for',
  'in',
  'module',
  'of',
  'on',
  'the',
  'to',
  'with',
]);

function normalizeResourceIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

export function normalizeModuleTitleForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function titleTokens(value: string): string[] {
  return normalizeModuleTitleForMatch(value)
    .split(' ')
    .filter((token) => token.length > 2 && !TITLE_STOP_WORDS.has(token));
}

function hasStrongTitleOverlap(left: string, right: string): boolean {
  const normalizedLeft = normalizeModuleTitleForMatch(left);
  const normalizedRight = normalizeModuleTitleForMatch(right);
  if (normalizedLeft && normalizedLeft === normalizedRight) return true;

  const leftTokens = new Set(titleTokens(left));
  const rightTokens = new Set(titleTokens(right));
  const smallerTokenCount = Math.min(leftTokens.size, rightTokens.size);
  if (smallerTokenCount < 2) return false;

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap >= 2 && overlap / smallerTokenCount >= 0.7;
}

export function resolveAttachModuleForCourseStudio(
  courseModule: CourseModulePlan,
  attachCourse?: Course,
): CourseModule | undefined {
  if (!attachCourse) return undefined;

  const byId = attachCourse.modules.find((module) => module.id === courseModule.id);
  if (byId) return byId;

  const normalizedTitle = normalizeModuleTitleForMatch(courseModule.title);
  const exactTitleMatches = attachCourse.modules.filter(
    (module) => normalizeModuleTitleForMatch(module.title) === normalizedTitle,
  );
  if (exactTitleMatches.length === 1) return exactTitleMatches[0];
  if (exactTitleMatches.length > 1) {
    throw new Error(
      `Multiple modules in "${attachCourse.title}" match "${courseModule.title}" by title.`,
    );
  }

  const strongTitleMatches = attachCourse.modules.filter((module) =>
    hasStrongTitleOverlap(module.title, courseModule.title),
  );
  if (strongTitleMatches.length === 1) return strongTitleMatches[0];
  if (strongTitleMatches.length > 1) {
    throw new Error(
      `Multiple modules in "${attachCourse.title}" are similar to "${courseModule.title}".`,
    );
  }

  const orderCandidate = attachCourse.modules[courseModule.order - 1];
  if (orderCandidate && hasStrongTitleOverlap(orderCandidate.title, courseModule.title)) {
    return orderCandidate;
  }

  throw new Error(
    `Could not safely attach module ${courseModule.order} "${courseModule.title}" to "${attachCourse.title}". Choose a course whose module ids or titles match the generated plan.`,
  );
}

export function buildModuleClassroomRequirement(params: {
  coursePlan: CoursePlan;
  courseModule: CourseModulePlan;
  audience?: string;
  courseResourceIds: string[];
}): string {
  const { coursePlan, courseModule } = params;
  const hasResources = params.courseResourceIds.length > 0;

  return [
    `Create an LC Academy classroom in English for module ${courseModule.order} of "${coursePlan.title}". All content, slide text, titles, and narration must be in English.`,
    `Module title: ${courseModule.title}.`,
    `Duration: ${courseModule.durationMinutes} minutes.`,
    `Audience: ${coursePlan.audience || params.audience || 'beginners'}.`,
    `Learning objectives: ${courseModule.learningObjectives.join('; ') || 'teach the module clearly'}.`,
    `Module plan: ${courseModule.classroomPrompt}`,
    hasResources
      ? 'Use the selected course resources supplied as reference material. Ground explanations, examples, vocabulary, and quiz items in that material whenever it is relevant.'
      : 'No selected resource text is attached, so stay tightly within the module plan and avoid unsupported specifics.',
    'Stay inside this module topic. Use the prerequisite summary only for continuity; do not teach future modules or let other modules bleed into this classroom.',
    'Avoid generic filler, unrelated examples, and unrelated subject matter. Every scene must advance this module objective.',
    'Generate 4 to 6 complete scenes: welcome, source-grounded core explanation, guided example or short discussion, learner question moment, quiz/checkpoint, and recap/completion.',
    'Keep scenes focused enough to generate quickly, but do not collapse important source concepts into a generic overview.',
    'The classroom must include an AI teacher, multiple AI students, one guided discussion, one learner question moment, and a quiz/checkpoint near the end.',
    'Use concrete examples from the selected resources where available. If a resource does not support a detail, do not invent it.',
    'Do not add generated video media unless Video media is explicitly enabled; prefer normal slide scenes and dialogue.',
    'End with a recap that prepares learners for the next course module. The classroom completion screen acts as the certificate/completion moment.',
    courseModule.prerequisiteSummary
      ? `Prior learning to reference: ${courseModule.prerequisiteSummary}`
      : '',
    courseModule.resourceFocus?.length
      ? `Resource focus: ${courseModule.resourceFocus.join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function buildModuleClassroomGenerationRequest(
  params: BuildModuleClassroomGenerationRequestParams,
): ModuleClassroomGenerationRequest {
  const courseResourceIds = normalizeResourceIds(params.courseResourceIds);
  let attachModule: CourseModule | undefined;
  let attachWarning: string | undefined;

  try {
    attachModule = resolveAttachModuleForCourseStudio(params.courseModule, params.attachCourse);
  } catch (error) {
    if (!params.allowSeparateGeneratedCourseOnAttachMismatch) throw error;
    attachWarning =
      error instanceof Error ? error.message : 'Could not match attach target safely.';
  }
  const portalCourse: GeneratedPortalCourseMetadata = {
    title: `${params.coursePlan.title}: Module ${params.courseModule.order} - ${params.courseModule.title}`,
    description:
      params.courseModule.learningObjectives.length > 0
        ? params.courseModule.learningObjectives.join(' ')
        : params.courseModule.classroomPrompt,
    category: params.coursePlan.title,
    estimatedDurationMinutes: params.courseModule.durationMinutes,
    ...(params.attachCourse && attachModule
      ? {
          attachToCourseId: params.attachCourse.id,
          attachToModuleId: attachModule.id,
        }
      : {}),
    ...(params.publishToDashboard && params.publishOrganizationId
      ? {
          publishToOrganizationId: params.publishOrganizationId,
          ...(params.publishCohortId ? { publishToCohortId: params.publishCohortId } : {}),
          publishStatus: 'active' as const,
        }
      : {}),
  };

  return {
    requirement: buildModuleClassroomRequirement({
      coursePlan: params.coursePlan,
      courseModule: params.courseModule,
      audience: params.audience,
      courseResourceIds,
    }),
    ...(courseResourceIds.length > 0 ? { courseResourceIds } : {}),
    agentMode: 'generate',
    enableVideoGeneration: params.enableVideoGeneration,
    enableImageGeneration: params.enableImageGeneration,
    enableTTS: params.enableTTS,
    portalCourse,
    ...(attachWarning ? { attachWarning } : {}),
  };
}
