import { type NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import {
  buildRequestOrigin,
  isValidClassroomId,
  persistClassroom,
  readClassroom,
} from '@/lib/server/classroom-storage';
import { createLogger } from '@/lib/logger';
import { canReadClassroom } from '@/lib/server/classroom-access';
import {
  getClassroomCourseAccessContext,
  getOrganizationById,
} from '@/lib/server/course-portal-data';

const log = createLogger('Classroom API');

export async function POST(request: NextRequest) {
  let stageId: string | undefined;
  let sceneCount: number | undefined;
  try {
    const body = await request.json();
    const { stage, scenes } = body;
    stageId = stage?.id;
    sceneCount = scenes?.length;

    if (!stage || !scenes) {
      return apiError(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD,
        400,
        'Missing required fields: stage, scenes',
      );
    }

    const id = stage.id || randomUUID();
    const baseUrl = buildRequestOrigin(request);

    const persisted = await persistClassroom({ id, stage: { ...stage, id }, scenes }, baseUrl);

    return apiSuccess({ id: persisted.id, url: persisted.url }, 201);
  } catch (error) {
    log.error(
      `Classroom storage failed [stageId=${stageId ?? 'unknown'}, scenes=${sceneCount ?? 0}]:`,
      error,
    );
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to store classroom',
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return apiError(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD,
        400,
        'Missing required parameter: id',
      );
    }

    if (!isValidClassroomId(id)) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, 'Invalid classroom id');
    }

    // Preserve OpenMAIC's public generation workflow for classrooms that are
    // not published through LC Academy. Published LMS classrooms require an
    // organization account or a valid course-access cookie.
    if (!(await canReadClassroom(id))) {
      const accessContext = await getClassroomCourseAccessContext(id);
      if (accessContext && accessContext.assignments.length > 0) {
        const assignment = accessContext.assignments[0]!;
        const organization = await getOrganizationById(assignment.organizationId);
        return NextResponse.json(
          {
            success: false,
            errorCode: API_ERROR_CODES.INVALID_REQUEST,
            error: 'Course access required.',
            courseAccess: {
              courseId: accessContext.course.id,
              courseTitle: accessContext.course.title,
              universityId: assignment.organizationId,
              cohortId: assignment.cohortId,
              universityName: organization?.name ?? 'your institution',
            },
          },
          { status: 403 },
        );
      }
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 403, 'Course access required.');
    }

    const classroom = await readClassroom(id);
    if (!classroom) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 404, 'Classroom not found');
    }

    return apiSuccess({ classroom });
  } catch (error) {
    log.error(
      `Classroom retrieval failed [id=${request.nextUrl.searchParams.get('id') ?? 'unknown'}]:`,
      error,
    );
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to retrieve classroom',
      error instanceof Error ? error.message : String(error),
    );
  }
}
