'use client';

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpenCheck, FileText, LoaderCircle, PlayCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

type OrganizationOption = { id: string; name: string };

type JobState = {
  jobId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  step: string;
  progress: number;
  message: string;
  scenesGenerated?: number;
  totalScenes?: number;
  result?: {
    classroomId: string;
    url: string;
    scenesCount: number;
    portalCourse?: { id: string; slug: string; status: string };
  };
  error?: string;
};

type ApiError = { success: false; error?: string; details?: string };

const ENGLISH_DIRECTIVE =
  'Generate all learner-facing and instructor-facing content in English, regardless of the language used in this request. Use clear, natural English appropriate for the stated learner level.';

function messageFromResponse(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const candidate = body as { error?: unknown; details?: unknown };
  if (typeof candidate.error === 'string' && candidate.error) return candidate.error;
  if (typeof candidate.details === 'string' && candidate.details) return candidate.details;
  return fallback;
}

export function UpstreamCourseGenerator({
  organizations,
}: {
  organizations: OrganizationOption[];
}) {
  const abortRef = useRef<AbortController | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<JobState | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function parsePdf(file: File, signal: AbortSignal) {
    const formData = new FormData();
    formData.set('pdf', file);
    formData.set('providerId', 'unpdf');
    const response = await fetch('/api/parse-pdf', { method: 'POST', body: formData, signal });
    const body = (await response.json().catch(() => null)) as
      | { success: true; data: { text: string; images: string[] } }
      | ApiError
      | null;
    if (!response.ok || !body || body.success !== true || !('data' in body)) {
      throw new Error(messageFromResponse(body, 'The source PDF could not be extracted.'));
    }
    if (!body.data.text.trim()) throw new Error('The source PDF contains no extractable text.');
    // Source images are intentionally omitted here to keep the background-job
    // payload bounded. The upstream interactive generator still supports full
    // document image ingestion through its standard home-page workflow.
    return { text: body.data.text, images: [] as string[] };
  }

  async function pollJob(jobId: string, signal: AbortSignal) {
    const deadline = Date.now() + 45 * 60 * 1000;
    while (!signal.aborted && Date.now() < deadline) {
      const response = await fetch(`/api/generate-classroom/${encodeURIComponent(jobId)}`, {
        cache: 'no-store',
        signal,
      });
      const body = (await response.json().catch(() => null)) as
        | ({ success: true } & JobState)
        | ApiError
        | null;
      if (!response.ok || !body || body.success !== true) {
        throw new Error(messageFromResponse(body, 'Unable to read generation progress.'));
      }
      const next = body as JobState;
      setJob(next);
      if (next.status === 'succeeded') return;
      if (next.status === 'failed') throw new Error(next.error || 'Course generation failed.');
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(resolve, 5000);
        signal.addEventListener(
          'abort',
          () => {
            window.clearTimeout(timer);
            reject(new DOMException('Generation monitoring was cancelled.', 'AbortError'));
          },
          { once: true },
        );
      });
    }
    if (!signal.aborted) throw new Error('Generation did not finish within 45 minutes.');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSubmitting(true);
    setError(null);
    setJob(null);

    try {
      const form = new FormData(event.currentTarget);
      const title = String(form.get('title') || '').trim();
      const requirement = String(form.get('requirement') || '').trim();
      const description = String(form.get('description') || '').trim();
      const category = String(form.get('category') || '').trim();
      const level = String(form.get('level') || '').trim();
      const organizationId = String(form.get('organizationId') || '').trim();
      const publishStatus = String(form.get('publishStatus') || 'draft');
      const estimatedDurationMinutes = Number(form.get('estimatedDurationMinutes') || 0);
      const file = form.get('sourcePdf');

      if (!title || !requirement)
        throw new Error('Course title and generation brief are required.');

      const pdfContent =
        file instanceof File && file.size > 0 ? await parsePdf(file, controller.signal) : undefined;

      const response = await fetch('/api/generate-classroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          requirement: `${requirement}\n\n${ENGLISH_DIRECTIVE}`,
          pdfContent,
          agentMode: 'generate',
          enableWebSearch: false,
          enableImageGeneration: false,
          enableVideoGeneration: false,
          enableTTS: false,
          portalCourseMetadata: {
            title,
            description: description || undefined,
            category: category || 'English Language Training',
            level: level || undefined,
            estimatedDurationMinutes:
              Number.isFinite(estimatedDurationMinutes) && estimatedDurationMinutes > 0
                ? estimatedDurationMinutes
                : undefined,
            publishToOrganizationId: organizationId || undefined,
            publishStatus: organizationId && publishStatus === 'active' ? 'active' : 'draft',
          },
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            success: true;
            jobId: string;
            status: JobState['status'];
            step: string;
            message: string;
          }
        | ApiError
        | null;
      if (!response.ok || !body || body.success !== true || !('jobId' in body)) {
        throw new Error(messageFromResponse(body, 'Generation job could not be created.'));
      }

      setJob({
        jobId: body.jobId,
        status: body.status,
        step: body.step,
        progress: 0,
        message: body.message,
      });
      await pollJob(body.jobId, controller.signal);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError(caught instanceof Error ? caught.message : 'Course generation failed.');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setSubmitting(false);
    }
  }

  return (
    <section className="grid gap-6 p-5 sm:p-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
            Course title
            <input
              name="title"
              required
              maxLength={160}
              className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-violet-500 focus:ring-3 focus:ring-violet-100"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
            Generation brief
            <textarea
              name="requirement"
              required
              rows={9}
              placeholder="Define the audience, learner level, measurable outcomes, real-world scenario, assessment method, and desired interactivity."
              className="rounded-md border border-slate-300 px-3 py-2 font-normal leading-6 outline-none focus:border-violet-500 focus:ring-3 focus:ring-violet-100"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
            Approved source PDF <span className="font-normal text-slate-500">(recommended)</span>
            <input
              name="sourcePdf"
              type="file"
              accept="application/pdf"
              className="rounded-md border border-slate-300 px-3 py-2 font-normal file:mr-3 file:rounded file:border-0 file:bg-violet-50 file:px-3 file:py-1.5 file:font-semibold file:text-violet-700"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
            Catalog description
            <textarea
              name="description"
              maxLength={420}
              rows={3}
              className="rounded-md border border-slate-300 px-3 py-2 font-normal outline-none focus:border-violet-500 focus:ring-3 focus:ring-violet-100"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">
            Category
            <input
              name="category"
              defaultValue="English Language Training"
              maxLength={80}
              className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-violet-500 focus:ring-3 focus:ring-violet-100"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">
            Learner level
            <input
              name="level"
              placeholder="B1, B2, Advanced…"
              maxLength={80}
              className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-violet-500 focus:ring-3 focus:ring-violet-100"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">
            Estimated duration (minutes)
            <input
              name="estimatedDurationMinutes"
              type="number"
              min={1}
              max={10080}
              defaultValue={60}
              className="h-11 rounded-md border border-slate-300 px-3 font-normal outline-none focus:border-violet-500 focus:ring-3 focus:ring-violet-100"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">
            Assign to school
            <select
              name="organizationId"
              defaultValue=""
              className="h-11 rounded-md border border-slate-300 bg-white px-3 font-normal outline-none focus:border-violet-500 focus:ring-3 focus:ring-violet-100"
            >
              <option value="">No school — catalog draft only</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
            Initial publishing state
            <select
              name="publishStatus"
              defaultValue="draft"
              className="h-11 rounded-md border border-slate-300 bg-white px-3 font-normal outline-none focus:border-violet-500 focus:ring-3 focus:ring-violet-100"
            >
              <option value="draft">Draft — review before learners can access it</option>
              <option value="active">Active — only when a school is selected</option>
            </select>
          </label>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={submitting}
            className="bg-violet-700 text-white hover:bg-violet-800"
          >
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <BookOpenCheck className="size-4" />
            )}
            {submitting ? 'Generating…' : 'Generate catalog course'}
          </Button>
          {submitting && (
            <Button type="button" variant="outline" onClick={() => abortRef.current?.abort()}>
              Stop monitoring
            </Button>
          )}
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-5 text-sm leading-6 text-violet-950">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-5" /> Draft-first production
          </div>
          <p className="mt-2">
            This uses the current upstream OpenMAIC generation pipeline. LC Academy adds
            authentication, school assignment, catalog registration, and publishing controls after
            generation.
          </p>
          <p className="mt-2">
            English output is enforced. Media providers remain off until their server configuration
            is verified.
          </p>
        </div>

        {(job || error) && (
          <div
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            aria-live="polite"
          >
            <h2 className="font-semibold text-slate-950">Generation status</h2>
            {job && (
              <>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-violet-600 transition-all"
                    style={{ width: `${Math.max(2, Math.min(100, job.progress))}%` }}
                  />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-800">{job.message}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {job.step} · {job.progress}%
                  {job.totalScenes
                    ? ` · ${job.scenesGenerated || 0}/${job.totalScenes} scenes`
                    : ''}
                </p>
              </>
            )}
            {error && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {job?.status === 'succeeded' && job.result && (
              <div className="mt-4 grid gap-2">
                <Link
                  href={`/classroom/${job.result.classroomId}`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800"
                >
                  <PlayCircle className="size-4" /> Review classroom
                </Link>
                <Link
                  href="/admin/courses"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="size-4" /> Open course catalog
                </Link>
              </div>
            )}
          </div>
        )}
      </aside>
    </section>
  );
}
