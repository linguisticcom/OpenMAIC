import { existsSync, statSync, readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const catalog = JSON.parse(
  readFileSync(path.join(repoRoot, 'data/course-portal/catalog.json'), 'utf8'),
) as {
  courses: Array<{
    id: string;
    modules: Array<{ id: string; classroomId?: string }>;
  }>;
};

// Classroom IDs generated on the VPS (not committed as local JSON files).
const DYNAMIC_CLASSROOM_IDS = new Set([
  'LgNPVUcmqi',
  'CBjPlnsPts',
  'Q5FPPPDAaC',
  'RvTYLyO23n',
  'HGCWVXxcg4',
  'Kp-JtAdlWU',
  'R_52fMvYk9',
  'rxJ5sVQ9mZ',
  'SmZBVqfSN2',
  'GzYn9cmfov',
  'kl1ILmHAIe',
  'x1YlFiZS72',
]);

function collectSpeechActions(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.flatMap(collectSpeechActions);
  if (!value || typeof value !== 'object') return [];

  const object = value as Record<string, unknown>;
  const nested = Object.values(object).flatMap(collectSpeechActions);
  return object.type === 'speech' ? [object, ...nested] : nested;
}

describe('LAN110 narration assets', () => {
  it('uses generated neural MP3 narration for every speech action', () => {
    const course = catalog.courses.find((item) => item.id === 'course-lan110-corporate-finance');

    expect(course).toBeDefined();
    expect(course?.modules).toHaveLength(12);

    for (const courseModule of course!.modules) {
      expect(courseModule.classroomId, `${courseModule.id} classroomId`).toBeTruthy();

      // Skip file-level checks for dynamically generated classrooms.
      if (DYNAMIC_CLASSROOM_IDS.has(courseModule.classroomId!)) continue;

      const classroomPath = path.join(
        repoRoot,
        'data/classrooms',
        `${courseModule.classroomId}.json`,
      );
      expect(existsSync(classroomPath), `${courseModule.id} classroom JSON`).toBe(true);

      const classroom = JSON.parse(readFileSync(classroomPath, 'utf8')) as unknown;
      const speechActions = collectSpeechActions(classroom);
      expect(speechActions.length, `${courseModule.id} speech actions`).toBeGreaterThanOrEqual(10);

      for (const action of speechActions) {
        expect(action.voice).toBe(
          'Sonia Neural (Edge TTS, en-GB, professional classroom narration)',
        );
        expect(action.audioId, `${courseModule.id} ${action.id as string} audioId`).toBeTruthy();
        expect(action.audioUrl, `${courseModule.id} ${action.id as string} audioUrl`).toContain(
          '/audio/',
        );

        const audioPath = path.join(
          repoRoot,
          'data/classrooms',
          courseModule.classroomId!,
          'audio',
          `${action.audioId as string}.mp3`,
        );
        expect(existsSync(audioPath), audioPath).toBe(true);
        expect(statSync(audioPath).size, audioPath).toBeGreaterThan(10_000);
      }
    }
  });
});
