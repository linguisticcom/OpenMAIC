import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const originalCwd = process.cwd();
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalStorageDir = process.env.COURSE_RESOURCE_STORAGE_DIR;
let tempRoot: string | undefined;

vi.mock('@/lib/server/tenant-api-auth', () => ({
  requirePlatformApiSession: vi.fn(async () => null),
}));

vi.mock('@/lib/server/resolve-model', () => ({
  resolveModelFromHeaders: vi.fn(async () => ({ model: {}, thinkingConfig: undefined })),
  resolveModelFromRequest: vi.fn(async () => ({ model: {}, thinkingConfig: undefined })),
}));

vi.mock('@/lib/ai/llm', () => ({
  callLLM: vi.fn(async () => ({ text: 'LLM generated teaching summary.' })),
}));

vi.mock('@/lib/pdf/pdf-providers', () => ({
  parsePDF: vi.fn(async () => ({
    text: 'Parsed PDF text about shares, creditors, and limited liability.',
    metadata: { pageCount: 3 },
  })),
}));

async function setupTempCwd() {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-course-resource-api-'));
  process.chdir(tempRoot);
  delete process.env.DATABASE_URL;
  delete process.env.COURSE_RESOURCE_STORAGE_DIR;
  vi.resetModules();
}

async function cleanup() {
  process.chdir(originalCwd);
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalStorageDir === undefined) delete process.env.COURSE_RESOURCE_STORAGE_DIR;
  else process.env.COURSE_RESOURCE_STORAGE_DIR = originalStorageDir;
  vi.resetModules();
  if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
  tempRoot = undefined;
}

beforeEach(async () => {
  await cleanup();
  await setupTempCwd();
});

afterEach(async () => {
  await cleanup();
});

function multipartRequest(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return new Request('http://localhost/api/course/resources', {
    method: 'POST',
    body: formData,
  }) as NextRequest;
}

function file(contents: string, name: string, type: string) {
  return new File([contents], name, { type });
}

describe('course resources API', () => {
  it('uploads, lists, reads, and deletes public resources without exposing internals', async () => {
    const routes = await import('@/app/api/course/resources/route');
    const itemRoutes = await import('@/app/api/course/resources/[id]/route');

    const uploadResponse = await routes.POST(
      multipartRequest(file('Business finance text source.', 'finance.txt', 'text/plain')),
    );
    expect(uploadResponse.status).toBe(201);
    const uploadJson = await uploadResponse.json();
    expect(uploadJson).toMatchObject({ success: true });
    const resource = uploadJson.resource as Record<string, unknown>;
    expect(resource.id).toEqual(expect.any(String));
    expect(resource.summary).toBe('LLM generated teaching summary.');
    expect(resource.text).toBeUndefined();
    expect(resource.storageKey).toBeUndefined();
    expect(resource.storageProvider).toBeUndefined();
    expect(resource.originalFileName).toBeUndefined();
    expect(resource.checksumSha256).toBeUndefined();

    const listResponse = await routes.GET();
    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toMatchObject({
      success: true,
      resources: [expect.objectContaining({ id: resource.id, name: 'finance.txt' })],
    });

    const getResponse = await itemRoutes.GET(
      new Request('http://localhost/api/course/resources/x') as NextRequest,
      {
        params: Promise.resolve({ id: resource.id as string }),
      },
    );
    expect(getResponse.status).toBe(200);
    const getJson = await getResponse.json();
    expect(getJson.resource.text).toBeUndefined();
    expect(getJson.resource.storageKey).toBeUndefined();

    const deleteResponse = await itemRoutes.DELETE(
      new Request('http://localhost/api/course/resources/x') as NextRequest,
      { params: Promise.resolve({ id: resource.id as string }) },
    );
    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toMatchObject({ success: true, deleted: true });

    const missingResponse = await itemRoutes.GET(
      new Request('http://localhost/api/course/resources/x') as NextRequest,
      { params: Promise.resolve({ id: resource.id as string }) },
    );
    expect(missingResponse.status).toBe(404);
  });

  it('accepts PDF and Markdown uploads and rejects unsupported file types', async () => {
    const routes = await import('@/app/api/course/resources/route');

    const pdfResponse = await routes.POST(
      multipartRequest(file('%PDF-1.4 fixture', 'finance.pdf', 'application/pdf')),
    );
    expect(pdfResponse.status).toBe(201);
    await expect(pdfResponse.json()).resolves.toMatchObject({
      success: true,
      resource: expect.objectContaining({ name: 'finance.pdf', pageCount: 3 }),
    });

    const markdownResponse = await routes.POST(
      multipartRequest(file('# Markdown source', 'notes.md', 'text/markdown')),
    );
    expect(markdownResponse.status).toBe(201);
    await expect(markdownResponse.json()).resolves.toMatchObject({
      success: true,
      resource: expect.objectContaining({ name: 'notes.md' }),
    });

    const unsupportedResponse = await routes.POST(
      multipartRequest(file('{"bad":true}', 'data.json', 'application/json')),
    );
    expect(unsupportedResponse.status).toBe(400);
    await expect(unsupportedResponse.json()).resolves.toMatchObject({
      success: false,
      error: 'Supported resource files are PDF, text, and Markdown.',
    });
  });

  it('passes selected resource summaries into course planning context', async () => {
    const { createCourseResource } = await import('@/lib/server/course-resources');
    const { POST: planCourse } = await import('@/app/api/course/plan/route');
    const { callLLM } = await import('@/lib/ai/llm');
    const llm = vi.mocked(callLLM);
    llm.mockClear();
    llm.mockResolvedValueOnce({
      text: JSON.stringify({
        title: 'Finance Basics',
        audience: 'business learners',
        totalDurationHours: 1,
        moduleDurationMinutes: 60,
        modules: [
          {
            id: 'module-1',
            order: 1,
            title: 'Working Capital',
            durationMinutes: 60,
            learningObjectives: ['Explain working capital'],
            prerequisiteSummary: 'No previous module required.',
            classroomPrompt: 'Teach working capital from the selected source.',
            resourceFocus: ['Working capital source summary.'],
          },
        ],
      }),
    } as never);
    const resource = await createCourseResource({
      file: file(
        'Working capital equals current assets minus current liabilities.',
        'finance.txt',
        'text/plain',
      ),
      summary: 'Working capital source summary.',
    });

    const response = await planCourse(
      new Request('http://localhost/api/course/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Finance Basics',
          totalDurationHours: 1,
          moduleDurationMinutes: 60,
          resourceIds: [resource.id],
        }),
      }) as NextRequest,
    );

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toMatchObject({
      success: true,
      plan: expect.objectContaining({ title: 'Finance Basics' }),
      course: expect.objectContaining({
        title: 'Finance Basics',
        status: 'draft',
        modules: [expect.objectContaining({ id: 'module-1' })],
      }),
    });
    expect(responseBody.course.modules[0].classroomId).toBeUndefined();
    const { getCoursePortalDataset } = await import('@/lib/server/course-portal-data');
    const dataset = await getCoursePortalDataset();
    expect(dataset.courses).toContainEqual(
      expect.objectContaining({ id: responseBody.course.id, status: 'draft' }),
    );
    const prompt = (llm.mock.calls.at(-1)?.[0] as { prompt?: string } | undefined)?.prompt;
    expect(prompt).toContain('Working capital source summary.');
    expect(prompt).toContain('Working capital equals current assets');
  });
});
