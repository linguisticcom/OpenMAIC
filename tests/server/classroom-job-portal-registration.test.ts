import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateClassroom: vi.fn(),
  markFailed: vi.fn(),
  markRunning: vi.fn(),
  markSucceeded: vi.fn(),
  registerCourse: vi.fn(),
  updateProgress: vi.fn(),
}));

vi.mock('@/lib/server/classroom-generation', () => ({
  generateClassroom: mocks.generateClassroom,
}));

vi.mock('@/lib/server/classroom-job-store', () => ({
  markClassroomGenerationJobFailed: mocks.markFailed,
  markClassroomGenerationJobRunning: mocks.markRunning,
  markClassroomGenerationJobSucceeded: mocks.markSucceeded,
  updateClassroomGenerationJobProgress: mocks.updateProgress,
}));

vi.mock('@/lib/server/course-portal-data', () => ({
  registerGeneratedClassroomCourse: mocks.registerCourse,
}));

import { runClassroomGenerationJob } from '@/lib/server/classroom-job-runner';

const generated = {
  id: 'classroom-upstream-1',
  url: 'https://academy.example.test/classroom/classroom-upstream-1',
  stage: { id: 'classroom-upstream-1', name: 'Upstream course' },
  scenes: [{ id: 'scene-1', stageId: 'classroom-upstream-1', type: 'slide', order: 1 }],
  scenesCount: 1,
  createdAt: '2026-08-03T00:00:00.000Z',
};

describe('classroom publishing job runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateClassroom.mockResolvedValue(generated);
    mocks.registerCourse.mockResolvedValue({
      id: 'course-classroom-upstream-1',
      slug: 'upstream-course',
      status: 'draft',
    });
  });

  it('registers a completed upstream classroom in the LC catalog when metadata is present', async () => {
    await runClassroomGenerationJob(
      'portal-job-1',
      {
        requirement: 'Generate an English course.',
        portalCourseMetadata: { title: 'Upstream course', publishStatus: 'draft' },
      },
      'https://academy.example.test',
    );

    expect(mocks.registerCourse).toHaveBeenCalledWith({
      classroomId: generated.id,
      stage: generated.stage,
      scenes: generated.scenes,
      metadata: { title: 'Upstream course', publishStatus: 'draft' },
    });
    expect(mocks.markSucceeded).toHaveBeenCalledWith(
      'portal-job-1',
      expect.objectContaining({
        portalCourse: {
          id: 'course-classroom-upstream-1',
          slug: 'upstream-course',
          status: 'draft',
        },
      }),
    );
  });

  it('does not create a catalog course for an ordinary upstream generation job', async () => {
    await runClassroomGenerationJob(
      'upstream-job-1',
      { requirement: 'Generate an English course.' },
      'https://academy.example.test',
    );

    expect(mocks.registerCourse).not.toHaveBeenCalled();
    expect(mocks.markSucceeded).toHaveBeenCalledWith('upstream-job-1', generated);
  });
});
