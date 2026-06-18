import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';
import {
  createCourseResource,
  listCourseResources,
  toPublicCourseResource,
  updateCourseResourceSummary,
} from '@/lib/server/course-resources';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolveModelFromHeaders } from '@/lib/server/resolve-model';

const log = createLogger('Course Resources API');

export const maxDuration = 120;

function fallbackSummary(text: string, name: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return `No readable text could be extracted from ${name}.`;
  return normalized.length <= 900 ? normalized : `${normalized.slice(0, 900).trim()}...`;
}

async function summarizeResource(req: NextRequest, name: string, text: string): Promise<string> {
  if (!text.trim()) return fallbackSummary(text, name);

  try {
    const { model, thinkingConfig } = await resolveModelFromHeaders(req);
    const result = await callLLM(
      {
        model,
        system:
          'Summarize source material for an AI course planner. Return concise plain text, not markdown.',
        prompt: `Resource name: ${name}\n\nSource excerpt:\n${text.slice(0, 12000)}\n\nWrite a 5-8 sentence teaching-focused summary. Include key concepts, examples, and constraints useful for generating course modules.`,
        maxOutputTokens: 900,
      },
      'course-resource-summary',
      undefined,
      thinkingConfig,
    );
    return result.text.trim() || fallbackSummary(text, name);
  } catch (error) {
    log.warn(`Resource summary generation failed for "${name}", using extractive summary:`, error);
    return fallbackSummary(text, name);
  }
}

export async function GET() {
  try {
    const resources = await listCourseResources();
    return apiSuccess({ resources });
  } catch (error) {
    log.error('Failed to list course resources:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to list course resources',
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function POST(req: NextRequest) {
  let fileName: string | undefined;

  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return apiError('INVALID_REQUEST', 400, 'Expected multipart/form-data');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'file is required');
    }

    fileName = file.name;
    const resource = await createCourseResource({ file });
    const summary = await summarizeResource(req, resource.name, resource.text);
    const saved = (await updateCourseResourceSummary(resource.id, summary)) || resource;

    return apiSuccess({ resource: toPublicCourseResource(saved) }, 201);
  } catch (error) {
    log.error(`Failed to upload course resource [file="${fileName ?? 'unknown'}"]:`, error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to upload course resource',
      error instanceof Error ? error.message : String(error),
    );
  }
}
