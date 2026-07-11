import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { callLLM } from '@/lib/ai/llm';
import { parseJsonResponse } from '@/lib/generation/json-repair';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createPlannedCourseDraft } from '@/lib/server/course-portal-data';
import { buildResourceSummaryBlock } from '@/lib/server/course-resources';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import { requirePlatformApiSession } from '@/lib/server/tenant-api-auth';
import type {
  CourseModulePlan,
  CoursePlan,
  CoursePlanningRequest,
} from '@/lib/types/course-studio';

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
  const isAiCourse = /\b(ai|artificial intelligence|machine learning|ml|generative ai)\b/i.test(
    topic,
  );
  const aiTopics = [
    'Introduction to AI Concepts',
    'Types of AI',
    'Applications of AI',
    'Ethics in AI',
    'Data and Learning from Examples',
    'Machine Learning Fundamentals',
    'Supervised Learning',
    'Unsupervised Learning',
    'Model Training and Evaluation',
    'Neural Networks and Deep Learning',
    'Natural Language Processing',
    'Computer Vision',
    'Generative AI and Large Language Models',
    'Prompting and Human-AI Interaction',
    'AI Agents and Tool Use',
    'Knowledge Representation and Reasoning',
    'Search, Planning, and Optimization',
    'Recommendation and Personalization Systems',
    'AI in Business and Operations',
    'AI in Healthcare and Public Services',
    'AI in Education and Communication',
    'Privacy, Security, and Governance',
    'Bias, Fairness, and Explainability',
    'Automation, Work, and Organizational Change',
    'Designing an AI Use Case',
    'Evaluating AI Products and Vendors',
    'Building Responsible AI Workflows',
    'AI Project Workshop',
    'Future Trends in AI',
    'Capstone Review and Learning Roadmap',
  ];
  const genericTopics = [
    'Course Orientation and Key Questions',
    'Core Concepts and Vocabulary',
    'Historical Context and Current Relevance',
    'Foundational Frameworks',
    'Essential Methods and Tools',
    'Worked Example 1',
    'Worked Example 2',
    'Common Misconceptions and Pitfalls',
    'Applied Case Study',
    'Practice Lab',
    'Comparing Alternative Approaches',
    'Decision-Making and Tradeoffs',
    'Communication and Presentation',
    'Quality Criteria and Evaluation',
    'Advanced Concepts',
    'Cross-Disciplinary Applications',
    'Ethical and Social Considerations',
    'Implementation Planning',
    'Collaboration and Stakeholders',
    'Troubleshooting and Iteration',
    'Assessment Workshop',
    'Real-World Scenario Analysis',
    'Project Design',
    'Project Development',
    'Project Feedback',
    'Project Refinement',
    'Future Trends',
    'Career and Practice Pathways',
    'Synthesis and Review',
    'Capstone Presentation',
  ];
  const topicPlan = isAiCourse ? aiTopics : genericTopics;

  return Array.from({ length: moduleCount }, (_, index) => {
    const title = topicPlan[index] || `${topic}: Applied Module ${index + 1}`;
    return {
      id: nanoid(8),
      order: index + 1,
      title,
      durationMinutes: moduleDurationMinutes,
      learningObjectives: [
        `Explain the key ideas in ${title.toLowerCase()}`,
        'Apply the lesson to a realistic beginner-friendly example',
      ],
      prerequisiteSummary:
        index === 0 ? 'No previous module required.' : `Build on modules 1-${index}.`,
      classroomPrompt: `Create a ${moduleDurationMinutes}-minute LC Academy classroom for "${title}" within a ${totalDurationHours}-hour course on ${topic}. Start with a brief connection to prior modules, teach the main concept with beginner-friendly examples, include one interactive discussion or activity, and end with a short recap that prepares learners for the next module.`,
      resourceFocus: [title],
    };
  });
}

function normalizeCoursePlan(
  raw: unknown,
  request: Required<
    Pick<CoursePlanningRequest, 'topic' | 'totalDurationHours' | 'moduleDurationMinutes'>
  > &
    Pick<CoursePlanningRequest, 'audience'>,
): CoursePlan {
  const value = raw && typeof raw === 'object' ? (raw as Partial<CoursePlan>) : {};
  const fallbackModules = buildFallbackModules(
    request.topic,
    request.totalDurationHours,
    request.moduleDurationMinutes,
  );
  const rawModules = Array.isArray(value.modules) && value.modules.length > 0 ? value.modules : [];
  const moduleSlots: unknown[] = Array.from(fallbackModules);
  let nextEmptyIndex = 0;
  rawModules.forEach((module) => {
    const order = Number((module as Partial<CourseModulePlan>).order);
    let index = Number.isFinite(order) && order > 0 ? order - 1 : -1;
    if (index < 0 || index >= fallbackModules.length) {
      while (
        nextEmptyIndex < moduleSlots.length &&
        moduleSlots[nextEmptyIndex] !== fallbackModules[nextEmptyIndex]
      ) {
        nextEmptyIndex++;
      }
      index = nextEmptyIndex;
    }
    if (index >= 0 && index < moduleSlots.length) {
      moduleSlots[index] = module;
    }
  });
  const modules = moduleSlots;
  const usedModuleIds = new Set<string>();

  return {
    title: value.title || request.topic,
    audience: value.audience || request.audience,
    totalDurationHours: Number(value.totalDurationHours) || request.totalDurationHours,
    moduleDurationMinutes: Number(value.moduleDurationMinutes) || request.moduleDurationMinutes,
    modules: modules.map((module, index) => {
      const m = module as Partial<CourseModulePlan>;
      const requestedId = typeof m.id === 'string' && m.id.trim() ? m.id.trim() : nanoid(8);
      let id = requestedId;
      let suffix = 2;
      while (usedModuleIds.has(id)) {
        id = `${requestedId}-${suffix}`;
        suffix += 1;
      }
      usedModuleIds.add(id);
      return {
        id,
        order: index + 1,
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
    const authError = await requirePlatformApiSession();
    if (authError) return authError;

    const body = (await req.json()) as CoursePlanningRequest;
    const topic = body.topic?.trim();
    topicSnippet = topic?.substring(0, 80);

    if (!topic) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'topic is required');
    }

    const totalDurationHours =
      body.totalDurationHours && body.totalDurationHours > 0 ? body.totalDurationHours : 15;
    const moduleDurationMinutes =
      body.moduleDurationMinutes && body.moduleDurationMinutes > 0
        ? body.moduleDurationMinutes
        : 30;
    const expectedModuleCount = Math.ceil((totalDurationHours * 60) / moduleDurationMinutes);
    const storedResourceSummary =
      Array.isArray(body.resourceIds) && body.resourceIds.length > 0
        ? await buildResourceSummaryBlock(body.resourceIds)
        : '';
    const resourcesSummary = [body.resourcesSummary, storedResourceSummary]
      .filter((value): value is string => Boolean(value?.trim()))
      .join('\n\n');

    const { model: languageModel, thinkingConfig } = await resolveModelFromRequest(req, body);

    const systemPrompt = `You are an expert curriculum architect for an AI classroom generator.
Design long courses as linked LC Academy classroom modules.
Return ONLY valid JSON. Do not use markdown.

CRITICAL: All content MUST be in English — module titles, learning objectives, and classroom prompts must all be in English regardless of the topic language or resource language.

Planning rules:
- Each module should become one classroom generation prompt.
- Modules must be incremental and reference prior learning.
- Keep module durations consistent.
- Return exactly ${expectedModuleCount} modules. Do not summarize, omit, collapse, or write "continue similarly".
- Include resourceFocus items when provided resources should influence a module.
- The classroomPrompt must be directly usable by LC Academy classroom generation.`;

    const userPrompt = `Plan this course:
Topic: ${topic}
Total duration: ${totalDurationHours} hours
Module duration: ${moduleDurationMinutes} minutes
Expected module count: ${expectedModuleCount}
Required module orders: 1 through ${expectedModuleCount}
Audience: ${body.audience || 'not specified'}
Language: English (all course content, module titles, learning objectives, and classroom prompts must be in English)
Resources summary:
${resourcesSummary || 'No resource summary provided yet.'}

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
      "classroomPrompt": "complete prompt for generating this LC Academy classroom",
      "resourceFocus": ["resource or topic to emphasize"]
    }
  ]
}

The modules array must contain exactly ${expectedModuleCount} objects.`;

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

    const parsed = parseJsonResponse<unknown>(extractJsonObject(result.text));
    if (!parsed) throw new Error('Could not parse course plan JSON from model response');
    const plan = normalizeCoursePlan(parsed, {
      topic,
      totalDurationHours,
      moduleDurationMinutes,
      audience: body.audience,
    });
    const course = await createPlannedCourseDraft(plan);

    return apiSuccess({ plan, course });
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
