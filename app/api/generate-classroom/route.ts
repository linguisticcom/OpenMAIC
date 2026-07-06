import { after, type NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { MAX_PDF_CONTENT_CHARS } from '@/lib/constants/generation';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { type GenerateClassroomInput } from '@/lib/server/classroom-generation';
import { runClassroomGenerationJob } from '@/lib/server/classroom-job-runner';
import { createClassroomGenerationJob } from '@/lib/server/classroom-job-store';
import { buildRequestOrigin } from '@/lib/server/classroom-storage';
import {
  buildClassroomResourceContextBlock,
  CourseResourceContextError,
} from '@/lib/server/course-resources';
import { requirePlatformApiSession } from '@/lib/server/tenant-api-auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('GenerateClassroom API');

export const maxDuration = 30;

function sanitizeCourseResourceIds(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) {
    throw new CourseResourceContextError('courseResourceIds must be an array of resource ids.');
  }

  const ids = value.map((item) => {
    if (typeof item !== 'string') {
      throw new CourseResourceContextError('courseResourceIds must contain only strings.');
    }
    return item.trim();
  });
  const deduped = Array.from(new Set(ids.filter(Boolean)));
  return deduped.length > 0 ? deduped : undefined;
}

function sanitizePdfContent(value: unknown): GenerateClassroomInput['pdfContent'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as { text?: unknown; images?: unknown };
  const text = typeof candidate.text === 'string' ? candidate.text : '';
  const images = Array.isArray(candidate.images)
    ? candidate.images.filter((image): image is string => typeof image === 'string')
    : [];
  return text || images.length > 0 ? { text, images } : undefined;
}

function mergePdfContent(
  pdfContent: GenerateClassroomInput['pdfContent'] | undefined,
  resourceContext: string,
): GenerateClassroomInput['pdfContent'] | undefined {
  const mergedText = [pdfContent?.text, resourceContext]
    .filter((value): value is string => Boolean(value?.trim()))
    .join('\n\n');
  const images = pdfContent?.images || [];

  if (!mergedText && images.length === 0) return undefined;
  return {
    text:
      mergedText.length > MAX_PDF_CONTENT_CHARS
        ? mergedText.slice(0, MAX_PDF_CONTENT_CHARS)
        : mergedText,
    images,
  };
}

export async function POST(req: NextRequest) {
  let requirementSnippet: string | undefined;
  try {
    const authError = await requirePlatformApiSession();
    if (authError) return authError;

    const rawBody = (await req.json()) as Partial<GenerateClassroomInput>;
    requirementSnippet = rawBody.requirement?.substring(0, 60);
    const courseResourceIds = sanitizeCourseResourceIds(rawBody.courseResourceIds);
    const resourceContext = courseResourceIds
      ? await buildClassroomResourceContextBlock(courseResourceIds)
      : '';
    const pdfContent = mergePdfContent(sanitizePdfContent(rawBody.pdfContent), resourceContext);
    const body: GenerateClassroomInput = {
      requirement: rawBody.requirement || '',
      ...(pdfContent ? { pdfContent } : {}),
      ...(courseResourceIds ? { courseResourceIds } : {}),

      ...(rawBody.enableWebSearch != null ? { enableWebSearch: rawBody.enableWebSearch } : {}),
      ...(rawBody.webSearchProviderId ? { webSearchProviderId: rawBody.webSearchProviderId } : {}),
      ...(rawBody.webSearchApiKey ? { webSearchApiKey: rawBody.webSearchApiKey } : {}),
      ...(rawBody.baiduSubSources ? { baiduSubSources: rawBody.baiduSubSources } : {}),
      ...(rawBody.enableImageGeneration != null
        ? { enableImageGeneration: rawBody.enableImageGeneration }
        : {}),
      ...(rawBody.enableVideoGeneration != null
        ? { enableVideoGeneration: rawBody.enableVideoGeneration }
        : {}),
      ...(rawBody.enableTTS != null ? { enableTTS: rawBody.enableTTS } : {}),
      ...(rawBody.agentMode ? { agentMode: rawBody.agentMode } : {}),
      ...(rawBody.portalCourse
        ? {
            portalCourse: {
              ...(typeof rawBody.portalCourse.title === 'string'
                ? { title: rawBody.portalCourse.title }
                : {}),
              ...(typeof rawBody.portalCourse.description === 'string'
                ? { description: rawBody.portalCourse.description }
                : {}),
              ...(typeof rawBody.portalCourse.category === 'string'
                ? { category: rawBody.portalCourse.category }
                : {}),
              ...(typeof rawBody.portalCourse.level === 'string'
                ? { level: rawBody.portalCourse.level }
                : {}),
              ...(typeof rawBody.portalCourse.estimatedDurationMinutes === 'number'
                ? { estimatedDurationMinutes: rawBody.portalCourse.estimatedDurationMinutes }
                : {}),
              ...(typeof rawBody.portalCourse.attachToCourseId === 'string'
                ? { attachToCourseId: rawBody.portalCourse.attachToCourseId }
                : {}),
              ...(typeof rawBody.portalCourse.attachToModuleId === 'string'
                ? { attachToModuleId: rawBody.portalCourse.attachToModuleId }
                : {}),
              ...(typeof rawBody.portalCourse.publishToOrganizationId === 'string'
                ? { publishToOrganizationId: rawBody.portalCourse.publishToOrganizationId }
                : {}),
              ...(typeof rawBody.portalCourse.publishToCohortId === 'string'
                ? { publishToCohortId: rawBody.portalCourse.publishToCohortId }
                : {}),
              ...(typeof rawBody.portalCourse.publishToTeacherUserId === 'string'
                ? { publishToTeacherUserId: rawBody.portalCourse.publishToTeacherUserId }
                : {}),
              ...(rawBody.portalCourse.publishStatus === 'active' ||
              rawBody.portalCourse.publishStatus === 'draft'
                ? { publishStatus: rawBody.portalCourse.publishStatus }
                : {}),
            },
          }
        : {}),
    };
    const { requirement } = body;

    if (!requirement) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: requirement');
    }

    const baseUrl = buildRequestOrigin(req);
    const jobId = nanoid(10);
    const job = await createClassroomGenerationJob(jobId, body);
    const pollUrl = `${baseUrl}/api/generate-classroom/${jobId}`;

    after(() => runClassroomGenerationJob(jobId, body, baseUrl));

    return apiSuccess(
      {
        jobId,
        status: job.status,
        step: job.step,
        message: job.message,
        pollUrl,
        pollIntervalMs: 5000,
      },
      202,
    );
  } catch (error) {
    if (error instanceof CourseResourceContextError) {
      return apiError('INVALID_REQUEST', 400, error.message);
    }

    log.error(
      `Classroom generation job creation failed [requirement="${requirementSnippet ?? 'unknown'}..."]:`,
      error,
    );
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to create classroom generation job',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
