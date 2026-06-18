import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { callLLM } from '@/lib/ai/llm';
import { parseJsonResponse } from '@/lib/generation/json-repair';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import type {
  ClassroomEditPatch,
  ClassroomEditPlan,
  ClassroomEditRequest,
} from '@/lib/types/course-studio';

const log = createLogger('Classroom Edit API');

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

function compactScenesForPrompt(scenes: ClassroomEditRequest['scenes']) {
  return scenes.map((scene) => ({
    id: scene.id,
    order: scene.order,
    type: scene.type,
    title: scene.title,
    actionCount: scene.actions?.length ?? 0,
    summary: summarizeSceneContent(scene),
  }));
}

function summarizeSceneContent(scene: ClassroomEditRequest['scenes'][number]): string {
  switch (scene.content.type) {
    case 'quiz':
      return `${scene.content.questions.length} quiz questions`;
    case 'interactive':
      return scene.content.widgetType || 'interactive scene';
    case 'pbl':
      return (
        scene.content.projectConfig?.projectInfo?.title ||
        scene.content.projectConfig?.projectInfo?.description ||
        'PBL project'
      );
    case 'slide':
    default:
      return `${scene.content.canvas?.elements?.length ?? 0} slide elements`;
  }
}

function normalizePlan(raw: unknown, instruction: string): ClassroomEditPlan {
  const value = raw && typeof raw === 'object' ? (raw as Partial<ClassroomEditPlan>) : {};
  const patches = Array.isArray(value.patches)
    ? value.patches.map((patch, index) => {
        const p = patch as Partial<ClassroomEditPatch>;
        return {
          id: typeof p.id === 'string' && p.id ? p.id : nanoid(8),
          operation: p.operation || 'request_regeneration',
          targetId: p.targetId,
          afterSceneId: p.afterSceneId,
          title: p.title || `Edit ${index + 1}`,
          rationale: p.rationale || 'Requested by the user.',
          changes: p.changes && typeof p.changes === 'object' ? p.changes : {},
        };
      })
    : [];

  return {
    summary: value.summary || `Prepared an edit plan for: ${instruction}`,
    patches,
    followUpQuestions: Array.isArray(value.followUpQuestions)
      ? value.followUpQuestions.filter((q): q is string => typeof q === 'string')
      : [],
  };
}

export async function POST(req: NextRequest) {
  let instructionSnippet: string | undefined;

  try {
    const body = (await req.json()) as ClassroomEditRequest;
    const { instruction, stage, scenes, currentSceneId, courseMemory } = body;
    instructionSnippet = instruction?.substring(0, 80);

    if (!instruction || !stage || !Array.isArray(scenes)) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'instruction, stage, and scenes are required',
      );
    }

    const { model: languageModel, thinkingConfig } = await resolveModelFromRequest(req, body);

    const systemPrompt = `You are the edit agent for an AI classroom studio.
You receive an existing LC Academy classroom and a user instruction.
Return ONLY valid JSON. Do not write markdown.

Your task is to propose a safe structured edit plan, not to regenerate the whole classroom unless necessary.
Allowed operations:
- update_stage
- update_scene
- insert_scene_after
- delete_scene
- add_teacher_note
- request_regeneration

Patch rules:
- Prefer small targeted patches.
- Use targetId for an existing scene or stage id.
- Use afterSceneId when inserting a new scene.
- Put exact proposed values inside changes.
- If the request is ambiguous, add followUpQuestions but still propose the safest useful patch.`;

    const userPrompt = `User instruction:
${instruction}

Current scene id:
${currentSceneId || 'none'}

Classroom:
${JSON.stringify(
  {
    stage: {
      id: stage.id,
      name: stage.name,
      description: stage.description,
      languageDirective: stage.languageDirective,
      style: stage.style,
    },
    scenes: compactScenesForPrompt(scenes),
    courseMemory,
  },
  null,
  2,
)}

Return JSON with this shape:
{
  "summary": "brief explanation of the proposed classroom change",
  "patches": [
    {
      "id": "stable patch id",
      "operation": "update_scene",
      "targetId": "scene or stage id",
      "afterSceneId": "scene id only for insert_scene_after",
      "title": "short patch title",
      "rationale": "why this improves the classroom",
      "changes": {
        "field": "new value or structured proposal"
      }
    }
  ],
  "followUpQuestions": []
}`;

    const result = await callLLM(
      {
        model: languageModel,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: 3000,
      },
      'classroom-edit',
      undefined,
      thinkingConfig,
    );

    const parsed = parseJsonResponse<unknown>(extractJsonObject(result.text));
    if (!parsed) throw new Error('Could not parse classroom edit JSON from model response');
    const plan = normalizePlan(parsed, instruction);

    return apiSuccess({ plan });
  } catch (error) {
    log.error(
      `Classroom edit failed [instruction="${instructionSnippet ?? 'unknown'}..."]:`,
      error,
    );
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to create classroom edit plan',
      error instanceof Error ? error.message : String(error),
    );
  }
}
