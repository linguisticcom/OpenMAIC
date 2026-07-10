import { expect, test } from '@playwright/test';

test('home exposes the institutional generated-course catalog', async ({ page, request }) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBe(true);
  await expect(health.json()).resolves.toMatchObject({
    success: true,
    service: 'openmaic',
    status: 'ok',
  });

  await page.goto('/');
  await page
    .getByRole('link', { name: /institution courses|courses/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/courses$/);
  await expect(
    page.getByRole('heading', { name: 'LAN110 Corporate Finance' }).first(),
  ).toBeVisible();
});

test('platform admin opens a generated course and can recover blocked narration', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const nativePlay = HTMLMediaElement.prototype.play;
    const nativeSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
    let deniedFirstAudioStart = false;
    (
      globalThis as typeof globalThis & {
        __openmaicAudioAttempts?: number;
        __openmaicMediaAttempts?: number;
        __openmaicBrowserVoiceAttempts?: number;
      }
    ).__openmaicAudioAttempts = 0;
    (
      globalThis as typeof globalThis & { __openmaicMediaAttempts?: number }
    ).__openmaicMediaAttempts = 0;
    (
      globalThis as typeof globalThis & { __openmaicBrowserVoiceAttempts?: number }
    ).__openmaicBrowserVoiceAttempts = 0;
    HTMLMediaElement.prototype.play = function patchedPlay() {
      const testState = globalThis as typeof globalThis & {
        __openmaicAudioAttempts?: number;
        __openmaicMediaAttempts?: number;
      };
      testState.__openmaicAudioAttempts = (testState.__openmaicAudioAttempts || 0) + 1;
      testState.__openmaicMediaAttempts = (testState.__openmaicMediaAttempts || 0) + 1;
      if (!deniedFirstAudioStart && this instanceof HTMLAudioElement) {
        deniedFirstAudioStart = true;
        return Promise.reject(
          new DOMException('play() failed: user did not interact', 'NotAllowedError'),
        );
      }
      return nativePlay.call(this);
    };
    window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
      if (!deniedFirstAudioStart && utterance.text.trim()) {
        deniedFirstAudioStart = true;
        const testState = globalThis as typeof globalThis & {
          __openmaicAudioAttempts?: number;
          __openmaicBrowserVoiceAttempts?: number;
        };
        testState.__openmaicAudioAttempts = (testState.__openmaicAudioAttempts || 0) + 1;
        testState.__openmaicBrowserVoiceAttempts =
          (testState.__openmaicBrowserVoiceAttempts || 0) + 1;
        queueMicrotask(() =>
          utterance.onerror?.({ error: 'not-allowed' } as SpeechSynthesisErrorEvent),
        );
        return;
      }
      nativeSpeak(utterance);
    };
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill('platform@openmaic.local');
  await page.getByLabel('Password').fill('openmaic-demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin(?:\/|$)/);

  await page.goto('/admin/courses');
  await expect(page.getByText(/published or assigned courses/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'LAN110 Corporate Finance' })).toBeVisible();
  await page.getByRole('link', { name: /open course orientation/i }).click();

  await expect(page).toHaveURL(/\/classroom\/a1wNxs34ed/, { timeout: 30_000 });
  const playButton = page.getByRole('button', { name: 'Play course narration' });
  await expect(playButton).toBeVisible({ timeout: 30_000 });
  await playButton.click();

  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (globalThis as typeof globalThis & { __openmaicAudioAttempts?: number })
              .__openmaicAudioAttempts || 0,
        ),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0);

  await expect(page.getByRole('alert').getByText('Course audio paused.')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: 'Play course narration' })).toBeVisible();

  await page.getByRole('button', { name: 'Retry audio' }).click();
  await expect(page.getByRole('button', { name: 'Pause' }).first()).toBeVisible();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (globalThis as typeof globalThis & { __openmaicBrowserVoiceAttempts?: number })
            .__openmaicBrowserVoiceAttempts || 0,
      ),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (globalThis as typeof globalThis & { __openmaicMediaAttempts?: number })
            .__openmaicMediaAttempts || 0,
      ),
    )
    .toBe(0);
});
