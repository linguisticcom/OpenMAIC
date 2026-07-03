import { NextRequest } from 'next/server';
import {
  deleteCourseResource,
  readCourseResource,
  toPublicCourseResource,
} from '@/lib/server/course-resources';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requirePlatformApiSession } from '@/lib/server/tenant-api-auth';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authError = await requirePlatformApiSession();
  if (authError) return authError;

  const { id } = await context.params;
  const resource = await readCourseResource(id);
  if (!resource) {
    return apiError('INVALID_REQUEST', 404, 'Resource not found');
  }

  return apiSuccess({ resource: toPublicCourseResource(resource) });
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authError = await requirePlatformApiSession();
  if (authError) return authError;

  const { id } = await context.params;
  const deleted = await deleteCourseResource(id);
  if (!deleted) {
    return apiError('INVALID_REQUEST', 404, 'Resource not found');
  }

  return apiSuccess({ deleted: true });
}
