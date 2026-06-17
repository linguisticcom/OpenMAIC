import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import type { CourseModulePlan, CoursePlan, CoursePlanningRequest } from '@/lib/types/course-studio';

const log = createLogger('Course Plan API');

export const maxDuration = 120;

function extractJsonObject(text: string): string {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*\n?/, '')
    .replace(/\n?```\s*$/, '')
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in model response');
  return match[0];
}

function buildFallbackModules(
  topic: string,
  totalDurationHours: number,
  moduleDurationMinutes: number,
): CourseModulePlan[] {
  const moduleCount = Math.max(1, Math.ceil((totalDurationHours * 60) / moduleDurationMinutes));
  return Array.from({ length: moduleCount }, (_, index) => ({
    id: nanoid(8),
    order: index + 1,
    title: `${topic} - Module ${index + 1}`,
    durationMinutes: moduleDurationMinutes,
    learningObjectives: [`Understand the key ideas for module ${index + 1}`],
    prerequisiteSummary:
      index === 0
        ? 'No previous module required.'
        : `Build on the concepts and examples from modules 1-${index}.`,
    classroomPrompt: `Create a ${moduleDurationMinutes}-minute OpenMAIC classroom for module ${index + 1} of a ${totalDurationHours}-hour course on ${topic}. Reference the previous module summaries where relevant and keep the lesson incremental.`,
    resourceFocus: [],
  }));
}

function normalizeCoursePlan(
  raw: unknown,
  request: Required<Pick<CoursePlanningRequest, 'topic' | 'totalDurationHours' | 'moduleDurationMinutes'>> &
    Pick<CoursePlanningRequest, 'audience'>,
): CoursePlan {
  const value = raw && typeof raw === 'object' ? (raw as Partial<CoursePlan>) : {};
  const fallbackModules = buildFallbackModules(
    request.topic,
    request.totalDurationHours,
    request.moduleDurationMinutes,
  );
  const modules = Array.isArray(value.modules) && value.modules.length > 0 ? value.modules : fallbackModules;

  return {
    title: value.title || request.topic,
    audience: value.audience || request.audience,
    totalDurationHours: Number(value.totalDurationHours) || request.totalDurationHours,
    moduleDurationMinutes: Number(value.moduleDurationMinutes) || request.moduleDurationMinutes,
    modules: modules.map((module, index) => {
      const m = module as Partial<CourseModulePlan>;
      return {
        id: typeof m.id === 'string' && m.id ? m.id : nanoid(8),
        order: Number(m.order) || index + 1,
        title: m.title || `${request.topic} - Module ${index + 1}`,
        durationMinutes: Number(m.durationMinutes) || request.moduleDurationMinutes,
        learningObjectives: Array.isArray(m.learningObjectives)
          ? m.learningObjectives.filter((item): item is string => typeof item === 'string')
          : fallbackModules[index]?.learningObjectives || [],
        prerequisiteSummary: m.prerequisiteSummary || fallbackModules[index]?.prerequisiteSummary,
        classroomPrompt: m.classroomPrompt || fallbackModules[index]?.classroomPrompt || '',
        resourceFocus: Array.isArray(m.resourceFocus)
          ? m.resourceFocus.filter((item): item is string => typeof item === 'string')
          : [],
      };
    }),
  };
}

export async function POST(req: NextRequest) {
  let topicSnippet: string | undefined;

  try {
    const body = (await req.json()) as CoursePlanningRequest;
    const topic = body.topic?.trim();
    topicSnippet = topic?.substring(0, 80);

    if (!topic) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'topic is required');
    }

    const totalDurationHours = body.totalDurationHours && body.totalDurationHours > 0 ? body.totalDurationHours : 15;
    const moduleDurationMinutes =
      body.moduleDurationMinutes && body.moduleDurationMinutes > 0 ? body.moduleDurationMinutes : 30;
    const expectedModuleCount = Math.ceil((totalDurationHours * 60) / moduleDurationMinutes);

    const { model: languageModel, thinkingConfig } = await resolveModelFromRequest(req, body);

    const systemPrompt = `You are an expert curriculum architect for an AI classroom generator.
Design long courses as linked OpenMAIC classroom modules.
Return ONLY valid JSON. Do not use markdown.

Planning rules:
- Each module should become one classroom generation prompt.
- Modules must be incremental and reference prior learning.
- Keep module durations consistent.
- Include resourceFocus items when provided resources should influence a module.
- The classroomPrompt must be directly usable by OpenMAIC generation.`;

    const userPrompt = `Plan this course:
Topic: ${topic}
Total duration: ${totalDurationHours} hours
Module duration: ${moduleDurationMinutes} minutes
Expected module count: ${expectedModuleCount}
Audience: ${body.audience || 'not specified'}
Language: ${body.language || 'infer from topic and resources'}
Resources summary:
${body.resourcesSummary || 'No resource summary provided yet.'}

Return JSON with this shape:
{
  "title": "course title",
  "audience": "target audience",
  "totalDurationHours": ${totalDurationHours},
  "moduleDurationMinutes": ${moduleDurationMinutes},
  "modules": [
    {
      "id": "stable module id",
      "order": 1,
      "title": "module title",
      "durationMinutes": ${moduleDurationMinutes},
      "learningObjectives": ["objective 1", "objective 2"],
      "prerequisiteSummary": "what prior modules this builds on",
      "classroomPrompt": "complete prompt for generating this OpenMAIC classroom",
      "resourceFocus": ["resource or topic to emphasize"]
    }
  ]
}`;

    const result = await callLLM(
      {
        model: languageModel,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: 6000,
      },
      'course-plan',
      undefined,
      thinkingConfig,
    );

    const parsed = JSON.parse(extractJsonObject(result.text));
    const plan = normalizeCoursePlan(parsed, {
      topic,
      totalDurationHours,
      moduleDurationMinutes,
      audience: body.audience,
    });

    return apiSuccess({ plan });
  } catch (error) {
    log.error(`Course planning failed [topic="${topicSnippet ?? 'unknown'}..."]:`, error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to create course plan',
      error instanceof Error ? error.message : String(error),
    );
  }
}
