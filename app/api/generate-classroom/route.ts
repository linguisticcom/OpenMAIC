import { after, type NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { type GenerateClassroomInput } from '@/lib/server/classroom-generation';
import { runClassroomGenerationJob } from '@/lib/server/classroom-job-runner';
import { createClassroomGenerationJob } from '@/lib/server/classroom-job-store';
import { buildRequestOrigin } from '@/lib/server/classroom-storage';
import { createLogger } from '@/lib/logger';
import { getCurrentPortalSession, isPlatformAdmin } from '@/lib/server/organization-session';

const log = createLogger('GenerateClassroom API');

function optionalString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function sanitizePortalCourseMetadata(
  input: NonNullable<GenerateClassroomInput['portalCourseMetadata']>,
): NonNullable<GenerateClassroomInput['portalCourseMetadata']> {
  return {
    title: optionalString(input.title, 160),
    description: optionalString(input.description, 420),
    category: optionalString(input.category, 80),
    level: optionalString(input.level, 80),
    publishToOrganizationId: optionalString(input.publishToOrganizationId, 160),
    publishToCohortId: optionalString(input.publishToCohortId, 160),
    publishToTeacherUserId: optionalString(input.publishToTeacherUserId, 160),
    attachToCourseId: optionalString(input.attachToCourseId, 160),
    attachToModuleId: optionalString(input.attachToModuleId, 160),
    publishStatus: input.publishStatus === 'active' ? 'active' : 'draft',
    estimatedDurationMinutes:
      typeof input.estimatedDurationMinutes === 'number' &&
      Number.isFinite(input.estimatedDurationMinutes) &&
      input.estimatedDurationMinutes > 0
        ? Math.min(Math.round(input.estimatedDurationMinutes), 10080)
        : undefined,
  };
}

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let requirementSnippet: string | undefined;
  try {
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
      ...(rawBody.portalCourseMetadata
        ? { portalCourseMetadata: sanitizePortalCourseMetadata(rawBody.portalCourseMetadata) }
        : {}),
    };
    const { requirement } = body;

    if (!requirement) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: requirement');
    }

    if (body.portalCourseMetadata) {
      const session = await getCurrentPortalSession();
      if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');
      if (!isPlatformAdmin(session.user)) {
        return apiError('INVALID_REQUEST', 403, 'Platform admin required.');
      }
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
