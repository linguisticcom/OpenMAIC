import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

interface CatalogModule {
  id: string;
  title: string;
  classroomId?: string;
}

interface CatalogCourse {
  slug: string;
  modules: CatalogModule[];
}

interface CatalogDataset {
  courses: CatalogCourse[];
}

interface ClassroomScene {
  title: string;
  actions?: Array<{ type: string; text?: string; audioId?: string; audioUrl?: string }>;
}

interface ClassroomArtifact {
  id: string;
  scenes: ClassroomScene[];
}

const root = process.cwd();

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8')) as T;
}

// Classroom IDs generated on the VPS (not committed as local JSON files).
// These use browser TTS instead of pre-generated MP3 audio.
const DYNAMIC_CLASSROOM_IDS = new Set([
  'IROe4q9yqd',
  'JNRj_yDl86',
  'yOnxQO4p__',
  'doZX1GthIK',
  '_wYiTIUyh6',
  'NlXmtM2VO1',
  'USF5EE8WoR',
  'OP270goDXu',
  'LMNUAHGqNi',
  'GinmvgUNOh',
  'vesaKsR1lt',
  'hMlkGBYADy',
]);

describe('LAN110 produced course artifacts', () => {
  it('attaches a non-smoke generated classroom artifact to every LAN110 module', () => {
    const catalog = readJson<CatalogDataset>('data/course-portal/catalog.json');
    const course = catalog.courses.find((item) => item.slug === 'lan110-corporate-finance');

    expect(course).toBeDefined();
    expect(course?.modules).toHaveLength(12);

    for (const courseModule of course?.modules ?? []) {
      expect(courseModule.classroomId, `${courseModule.id} is missing classroomId`).toBeTruthy();

      // Dynamically generated classrooms live on the VPS only — they don't have
      // local JSON artifacts or pre-generated MP3 audio. Skip file-level checks.
      if (DYNAMIC_CLASSROOM_IDS.has(courseModule.classroomId!)) continue;

      const classroomPath = `data/classrooms/${courseModule.classroomId}.json`;
      expect(existsSync(path.join(root, classroomPath)), `${classroomPath} does not exist`).toBe(
        true,
      );

      const classroom = readJson<ClassroomArtifact>(classroomPath);
      expect(
        classroom.scenes.length,
        `${courseModule.id} should be a full classroom`,
      ).toBeGreaterThanOrEqual(4);
      expect(
        classroom.scenes.some((scene) => scene.title.toLowerCase().includes('smoke')),
        `${courseModule.id} still looks like a smoke test`,
      ).toBe(false);

      const speechActions = classroom.scenes.flatMap((scene) =>
        (scene.actions ?? []).filter((action) => action.type === 'speech'),
      );
      expect(
        speechActions.length,
        `${courseModule.id} has no narrated speech actions`,
      ).toBeGreaterThan(4);
      expect(
        speechActions.every((action) => action.audioId && action.audioUrl?.includes('/audio/')),
        `${courseModule.id} has speech actions without generated audio files`,
      ).toBe(true);
      for (const action of speechActions) {
        const audioUrl = action.audioUrl ?? '';
        const audioPath = audioUrl.slice(audioUrl.indexOf('/audio/') + 1);
        expect(
          existsSync(path.join(root, 'data/classrooms', courseModule.classroomId!, audioPath)),
          `${courseModule.id} is missing generated audio file for ${action.audioId}`,
        ).toBe(true);
      }
      expect(
        speechActions.some((action) => /smoke run|very short/i.test(action.text ?? '')),
        `${courseModule.id} still contains smoke-test narration`,
      ).toBe(false);
    }
  });
});
