import { after, type NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { type GenerateClassroomInput } from '@/lib/server/classroom-generation';
import { runClassroomGenerationJob } from '@/lib/server/classroom-job-runner';
import { createClassroomGenerationJob } from '@/lib/server/classroom-job-store';
import { buildRequestOrigin } from '@/lib/server/classroom-storage';
import { requirePlatformApiSession } from '@/lib/server/tenant-api-auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('GenerateClassroom API');

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let requirementSnippet: string | undefined;
  try {
    const authError = await requirePlatformApiSession();
    if (authError) return authError;

    const rawBody = (await req.json()) as Partial<GenerateClassroomInput>;
    requirementSnippet = rawBody.requirement?.substring(0, 60);
    const body: GenerateClassroomInput = {
      requirement: rawBody.requirement || '',
      ...(rawBody.pdfContent ? { pdfContent: rawBody.pdfContent } : {}),

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
