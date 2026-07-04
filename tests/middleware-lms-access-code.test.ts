import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

function request(pathname: string, method?: string) {
  return new NextRequest(`http://localhost${pathname}`, method ? { method } : undefined);
}

function expectNext(response: Response) {
  expect(response.status).toBe(200);
  expect(response.headers.get('x-middleware-next')).toBe('1');
}

describe('deployment access-code middleware for LMS routes', () => {
  const originalAccessCode = process.env.ACCESS_CODE;

  afterEach(() => {
    if (originalAccessCode === undefined) {
      delete process.env.ACCESS_CODE;
    } else {
      process.env.ACCESS_CODE = originalAccessCode;
    }
  });

  it('lets LMS APIs reach their route-level session and access-code guards', async () => {
    process.env.ACCESS_CODE = 'site-wide-code';

    expectNext(await middleware(request('/api/organization-auth/login')));
    expectNext(await middleware(request('/api/organization/courses')));
    expectNext(await middleware(request('/api/course-access/validate')));
    expectNext(await middleware(request('/api/validate-course-access')));
    expectNext(await middleware(request('/api/admin/organizations')));
    expectNext(await middleware(request('/api/classroom?id=classroom-cloud')));
    expectNext(await middleware(request('/api/classroom-media/classroom-cloud/media/cover.png')));
  });

  it('keeps classroom writes behind the deployment access-code gate', async () => {
    process.env.ACCESS_CODE = 'site-wide-code';

    const response = await middleware(request('/api/classroom', 'POST'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Access code required',
    });
  });

  it('keeps unrelated APIs behind the deployment access-code gate', async () => {
    process.env.ACCESS_CODE = 'site-wide-code';

    const response = await middleware(request('/api/chat'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Access code required',
    });
  });
});
