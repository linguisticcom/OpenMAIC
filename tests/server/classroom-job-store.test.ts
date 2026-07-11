import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
let tempRoot: string | undefined;

async function withTempCwd(fn: () => Promise<void>) {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-classroom-job-'));
  try {
    process.chdir(tempRoot);
    vi.resetModules();
    await fn();
  } finally {
    process.chdir(originalCwd);
    vi.resetModules();
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
}

afterEach(async () => {
  process.chdir(originalCwd);
  vi.resetModules();
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
});

describe('classroom generation job store', () => {
  it('persists generated portal course links in completed job results', async () => {
    await withTempCwd(async () => {
      const jobStore = await import('@/lib/server/classroom-job-store');

      await jobStore.createClassroomGenerationJob('job-ai-1', {
        requirement: 'Create an AI class.',
      });
      await jobStore.markClassroomGenerationJobSucceeded('job-ai-1', {
        id: 'classroom-ai-1',
        url: 'https://academy.example/classroom/classroom-ai-1',
        stage: {
          id: 'classroom-ai-1',
          name: 'AI class',
          description: 'Generated AI classroom',
          createdAt: 1783504800000,
          updatedAt: 1783504800000,
        },
        scenes: [],
        scenesCount: 0,
        createdAt: '2026-07-08T10:00:00.000Z',
        audio: {
          narrationActions: 4,
          serverAudioRequested: true,
          serverAudioGenerated: 4,
          serverAudioComplete: true,
          providerId: 'openai',
        },
        portalCourse: {
          id: 'course-classroom-ai-1',
          title: 'AI class',
          slug: 'ai-class',
          status: 'active',
          classroomId: 'classroom-ai-1',
          url: 'https://academy.example/courses/ai-class',
          organizationUrl: 'https://academy.example/u/esilv/courses/ai-class',
        },
      });

      const job = await jobStore.readClassroomGenerationJob('job-ai-1');
      expect(job?.result).toMatchObject({
        classroomId: 'classroom-ai-1',
        url: 'https://academy.example/classroom/classroom-ai-1',
        audio: {
          narrationActions: 4,
          serverAudioGenerated: 4,
          serverAudioComplete: true,
        },
        portalCourse: {
          id: 'course-classroom-ai-1',
          url: 'https://academy.example/courses/ai-class',
          organizationUrl: 'https://academy.example/u/esilv/courses/ai-class',
        },
      });
    });
  });
});
