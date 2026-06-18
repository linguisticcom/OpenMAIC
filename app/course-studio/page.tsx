'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  PenLine,
  Play,
  RefreshCw,
  Trash2,
  Upload,
  WandSparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ClassroomEditPlan, CoursePlan, CourseResource } from '@/lib/types/course-studio';

function buildHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

function getApiErrorMessage(json: { error?: string; details?: string }, fallback: string) {
  return json.details ? `${json.error || fallback}: ${json.details}` : json.error || fallback;
}

interface ModuleGenerationJob {
  jobId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress: number;
  message: string;
  url?: string;
  error?: string;
}

export default function CourseStudioPage() {
  const [topic, setTopic] = useState('Introduction to Artificial Intelligence');
  const [hours, setHours] = useState('15');
  const [moduleMinutes, setModuleMinutes] = useState('30');
  const [audience, setAudience] = useState('');
  const [resourcesSummary, setResourcesSummary] = useState('');
  const [resources, setResources] = useState<CourseResource[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [isUploadingResource, setIsUploadingResource] = useState(false);
  const [coursePlan, setCoursePlan] = useState<CoursePlan | null>(null);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [moduleJobs, setModuleJobs] = useState<Record<string, ModuleGenerationJob>>({});
  const [enableClassroomImages, setEnableClassroomImages] = useState(false);
  const [enableClassroomVideo, setEnableClassroomVideo] = useState(false);
  const [enableLocalComputerVoice, setEnableLocalComputerVoice] = useState(true);
  const [enableClassroomTts, setEnableClassroomTts] = useState(false);
  const [hasServerTts, setHasServerTts] = useState<boolean | null>(null);

  const [editInstruction, setEditInstruction] = useState('Make slide 3 simpler and add a short debate after it.');
  const [classroomJson, setClassroomJson] = useState('');
  const [editPlan, setEditPlan] = useState<ClassroomEditPlan | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const moduleCount = useMemo(() => {
    const total = Number(hours) * 60;
    const size = Number(moduleMinutes);
    if (!Number.isFinite(total) || !Number.isFinite(size) || size <= 0) return 0;
    return Math.ceil(total / size);
  }, [hours, moduleMinutes]);

  const selectedResources = useMemo(
    () => resources.filter((resource) => selectedResourceIds.includes(resource.id)),
    [resources, selectedResourceIds],
  );

  const loadResources = async () => {
    setResourceError(null);
    setIsLoadingResources(true);

    try {
      const response = await fetch('/api/course/resources');
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to load resources'));
      }
      setResources(json.resources || []);
      setSelectedResourceIds((current) =>
        current.filter((id) =>
          (json.resources || []).some((resource: CourseResource) => resource.id === id),
        ),
      );
    } catch (error) {
      setResourceError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingResources(false);
    }
  };

  useEffect(() => {
    void loadResources();
  }, []);

  useEffect(() => {
    const loadProviderCapabilities = async () => {
      try {
        const response = await fetch('/api/server-providers');
        const json = await response.json();
        if (!response.ok || !json.success) return;
        const usableTtsProviders = Object.entries(json.tts || {}).filter(
          ([id, info]) =>
            id !== 'browser-native-tts' &&
            !(info as { disabled?: boolean } | undefined)?.disabled,
        );
        setHasServerTts(usableTtsProviders.length > 0);
      } catch {
        setHasServerTts(null);
      }
    };

    void loadProviderCapabilities();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const previousColorScheme = root.style.colorScheme;
    const hadDarkClass = root.classList.contains('dark');

    root.classList.remove('dark');
    root.style.colorScheme = 'light';

    return () => {
      root.style.colorScheme = previousColorScheme;
      if (hadDarkClass) root.classList.add('dark');
    };
  }, []);

  const uploadResource = async (file: File | null) => {
    if (!file) return;

    setResourceError(null);
    setIsUploadingResource(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/course/resources', {
        method: 'POST',
        headers: buildHeadersWithoutContentType(),
        body: formData,
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to upload resource'));
      }
      const resource = json.resource as CourseResource;
      setResources((current) => [resource, ...current]);
      setSelectedResourceIds((current) => [resource.id, ...current]);
    } catch (error) {
      setResourceError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsUploadingResource(false);
    }
  };

  const deleteResource = async (id: string) => {
    setResourceError(null);

    try {
      const response = await fetch(`/api/course/resources/${id}`, {
        method: 'DELETE',
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to delete resource'));
      }
      setResources((current) => current.filter((resource) => resource.id !== id));
      setSelectedResourceIds((current) => current.filter((resourceId) => resourceId !== id));
    } catch (error) {
      setResourceError(error instanceof Error ? error.message : String(error));
    }
  };

  const toggleResource = (id: string) => {
    setSelectedResourceIds((current) =>
      current.includes(id) ? current.filter((resourceId) => resourceId !== id) : [...current, id],
    );
  };

  const pollModuleJob = async (moduleId: string, pollUrl: string) => {
    try {
      const response = await fetch(pollUrl);
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to check classroom generation'));
      }

      setModuleJobs((current) => ({
        ...current,
        [moduleId]: {
          jobId: json.jobId,
          status: json.status,
          progress: json.progress ?? current[moduleId]?.progress ?? 0,
          message: json.error || json.message || current[moduleId]?.message || 'Generating classroom',
          url:
            json.result?.url && enableLocalComputerVoice
              ? `${json.result.url}?tts=browser`
              : json.result?.url || current[moduleId]?.url,
          error: json.error,
        },
      }));

      if (!json.done) {
        window.setTimeout(() => void pollModuleJob(moduleId, pollUrl), json.pollIntervalMs || 5000);
      }
    } catch (error) {
      setModuleJobs((current) => ({
        ...current,
        [moduleId]: {
          ...(current[moduleId] || {
            jobId: '',
            progress: 0,
            message: '',
          }),
          status: 'failed',
          message: error instanceof Error ? error.message : String(error),
          error: error instanceof Error ? error.message : String(error),
        },
      }));
    }
  };

  const generateModuleClassroom = async (moduleId: string) => {
    const module = coursePlan?.modules.find((item) => item.id === moduleId);
    if (!module || !coursePlan) return;

    setModuleJobs((current) => ({
      ...current,
      [moduleId]: {
        jobId: '',
        status: 'queued',
        progress: 0,
        message: 'Queuing classroom generation',
      },
    }));

    const requirement = [
      `Create an LC Academy classroom for module ${module.order} of "${coursePlan.title}".`,
      `Module title: ${module.title}.`,
      `Duration: ${module.durationMinutes} minutes.`,
      `Audience: ${coursePlan.audience || audience || 'beginners'}.`,
      `Learning objectives: ${module.learningObjectives.join('; ') || 'teach the module clearly'}.`,
      `Module plan: ${module.classroomPrompt}`,
      'The classroom must include an AI teacher, multiple AI students, guided discussion, at least one learner question moment, and a quiz/checkpoint near the end.',
      'End with a recap that prepares learners for the next course module. The classroom completion screen acts as the certificate/completion moment.',
      module.prerequisiteSummary ? `Prior learning to reference: ${module.prerequisiteSummary}` : '',
      module.resourceFocus?.length ? `Resource focus: ${module.resourceFocus.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const response = await fetch('/api/generate-classroom', {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          requirement,
          agentMode: 'generate',
          enableVideoGeneration: enableClassroomVideo,
          enableImageGeneration: enableClassroomImages,
          enableTTS: enableClassroomTts && !enableLocalComputerVoice,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to start classroom generation'));
      }

      setModuleJobs((current) => ({
        ...current,
        [moduleId]: {
          jobId: json.jobId,
          status: json.status,
          progress: 0,
          message: json.message || 'Classroom generation queued',
        },
      }));

      void pollModuleJob(moduleId, json.pollUrl || `/api/generate-classroom/${json.jobId}`);
    } catch (error) {
      setModuleJobs((current) => ({
        ...current,
        [moduleId]: {
          jobId: '',
          status: 'failed',
          progress: 0,
          message: error instanceof Error ? error.message : String(error),
          error: error instanceof Error ? error.message : String(error),
        },
      }));
    }
  };

  const planCourse = async () => {
    setCourseError(null);
    setCoursePlan(null);
    setIsPlanning(true);

    try {
      const response = await fetch('/api/course/plan', {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          topic,
          totalDurationHours: Number(hours),
          moduleDurationMinutes: Number(moduleMinutes),
          audience: audience || undefined,
          resourcesSummary: resourcesSummary || undefined,
          resourceIds: selectedResourceIds,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Course planning failed'));
      }
      setCoursePlan(json.plan);
    } catch (error) {
      setCourseError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsPlanning(false);
    }
  };

  const createEditPlan = async () => {
    setEditError(null);
    setEditPlan(null);
    setIsEditing(true);

    try {
      const classroom = JSON.parse(classroomJson) as {
        stage?: unknown;
        scenes?: unknown;
        classroom?: { stage?: unknown; scenes?: unknown };
      };
      const stage = classroom.stage || classroom.classroom?.stage;
      const scenes = classroom.scenes || classroom.classroom?.scenes;

      const response = await fetch('/api/classroom/edit', {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          instruction: editInstruction,
          stage,
          scenes,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Classroom edit planning failed'));
      }
      setEditPlan(json.plan);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            <img
              src="https://linguistic-communication.com/_next/image?url=%2Fimages%2Fwp%2F2018%2F03%2FLC-1.jpg&w=640&q=75"
              alt="LC Academy"
              className="h-16 w-40 rounded-md border border-border bg-white p-2 object-contain shadow-sm sm:w-52"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Course Studio
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">LC Academy</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="size-4" />
            <span>{moduleCount || 0} modules</span>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
          <Card className="rounded-lg border-border p-4 shadow-none">
            <div className="mb-4 flex items-center gap-2">
              <WandSparkles className="size-4 text-primary" />
              <h2 className="text-base font-semibold">Long Course Planner</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="topic">Topic</Label>
                <Input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="hours">Hours</Label>
                <Input id="hours" value={hours} onChange={(event) => setHours(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="moduleMinutes">Module minutes</Label>
                <Input
                  id="moduleMinutes"
                  value={moduleMinutes}
                  onChange={(event) => setModuleMinutes(event.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="audience">Audience</Label>
                <Input
                  id="audience"
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  placeholder="Beginners, business learners, university students"
                />
              </div>
              <div className="md:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Label htmlFor="resourceUpload">Resource library</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadResources}
                    disabled={isLoadingResources}
                    aria-label="Refresh resources"
                  >
                    {isLoadingResources ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                  </Button>
                </div>
                <div className="flex flex-col gap-3 rounded-md border border-border p-3">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground transition-colors hover:bg-muted/50">
                    {isUploadingResource ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    <span>{isUploadingResource ? 'Uploading and summarizing' : 'Upload PDF, text, or Markdown'}</span>
                    <Input
                      id="resourceUpload"
                      type="file"
                      accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
                      className="hidden"
                      disabled={isUploadingResource}
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        void uploadResource(file);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>

                  {resourceError && <p className="text-sm text-destructive">{resourceError}</p>}

                  <div className="max-h-72 divide-y divide-border overflow-auto rounded-md border border-border">
                    {resources.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground">
                        No resources saved yet.
                      </div>
                    ) : (
                      resources.map((resource) => {
                        const selected = selectedResourceIds.includes(resource.id);
                        return (
                          <article key={resource.id} className="flex gap-3 p-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleResource(resource.id)}
                              className="mt-1 size-4 accent-primary"
                              aria-label={`Use ${resource.name}`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <FileText className="size-4 shrink-0 text-muted-foreground" />
                                <h3 className="truncate text-sm font-medium">{resource.name}</h3>
                              </div>
                              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                                {resource.summary}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>{Math.max(1, Math.round(resource.size / 1024))} KB</span>
                                {resource.pageCount ? <span>{resource.pageCount} pages</span> : null}
                                <span>{resource.textLength.toLocaleString()} chars</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => void deleteResource(resource.id)}
                              aria-label={`Delete ${resource.name}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="resources">Resources summary</Label>
                <Textarea
                  id="resources"
                  value={resourcesSummary}
                  onChange={(event) => setResourcesSummary(event.target.value)}
                  className="min-h-28 resize-y"
                />
                {selectedResources.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {selectedResources.length} stored resources will be included in the plan.
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <Label>Classroom outputs</Label>
                <div className="mt-2 grid gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground sm:grid-cols-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enableClassroomImages}
                      onChange={(event) => setEnableClassroomImages(event.target.checked)}
                      className="size-4 accent-primary"
                    />
                    Slide visuals
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enableLocalComputerVoice}
                      onChange={(event) => {
                        setEnableLocalComputerVoice(event.target.checked);
                        if (event.target.checked) setEnableClassroomTts(false);
                      }}
                      className="size-4 accent-primary"
                    />
                    Local computer voice
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enableClassroomTts}
                      onChange={(event) => {
                        setEnableClassroomTts(event.target.checked);
                        if (event.target.checked) setEnableLocalComputerVoice(false);
                      }}
                      className="size-4 accent-primary"
                    />
                    Server voice
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enableClassroomVideo}
                      onChange={(event) => {
                        setEnableClassroomVideo(event.target.checked);
                      }}
                      className="size-4 accent-primary"
                    />
                    Video media
                  </label>
                </div>
                {enableLocalComputerVoice && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Local computer voice uses your browser/OS speech voices and costs nothing.
                  </p>
                )}
                {enableClassroomVideo && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Video clips are visual media. Spoken narration comes from Local computer voice or Server voice.
                  </p>
                )}
                {enableClassroomTts && hasServerTts === false && (
                  <p className="mt-2 text-xs text-destructive">
                    Server voice is selected, but no server TTS provider is configured.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button onClick={planCourse} disabled={isPlanning || !topic.trim()} className="gap-2">
                {isPlanning ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                Generate plan
              </Button>
              {courseError && <p className="text-sm text-destructive">{courseError}</p>}
            </div>

            {coursePlan && (
              <div className="mt-5 overflow-hidden rounded-md border border-border">
                <div className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-medium">
                  {coursePlan.title}
                </div>
                <div className="max-h-[520px] overflow-auto">
                  {coursePlan.modules.map((module) => (
                    <article key={module.id} className="border-b border-border p-3 last:border-b-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">
                          {module.order}. {module.title}
                        </h3>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {module.durationMinutes} min
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {module.classroomPrompt}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void generateModuleClassroom(module.id)}
                          disabled={
                            moduleJobs[module.id]?.status === 'queued' ||
                            moduleJobs[module.id]?.status === 'running'
                          }
                          className="gap-2"
                        >
                          {moduleJobs[module.id]?.status === 'queued' ||
                          moduleJobs[module.id]?.status === 'running' ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Play className="size-4" />
                          )}
                          Generate classroom
                        </Button>
                        {moduleJobs[module.id]?.url && (
                          <Button type="button" size="sm" variant="outline" asChild>
                            <a
                              href={moduleJobs[module.id].url}
                              target="_blank"
                              rel="noreferrer"
                              className="gap-2"
                            >
                              <ExternalLink className="size-4" />
                              Open classroom
                            </a>
                          </Button>
                        )}
                        {moduleJobs[module.id] && (
                          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                            {moduleJobs[module.id].status === 'succeeded' ? (
                              <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                            ) : null}
                            <span className="truncate">
                              {moduleJobs[module.id].status === 'running'
                                ? `${moduleJobs[module.id].progress}% - ${moduleJobs[module.id].message}`
                                : moduleJobs[module.id].message}
                            </span>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="rounded-lg border-border p-4 shadow-none">
            <div className="mb-4 flex items-center gap-2">
              <PenLine className="size-4 text-primary" />
              <h2 className="text-base font-semibold">Classroom Edit Planner</h2>
            </div>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="editInstruction">Instruction</Label>
                <Textarea
                  id="editInstruction"
                  value={editInstruction}
                  onChange={(event) => setEditInstruction(event.target.value)}
                  className="min-h-24 resize-y"
                />
              </div>
              <div>
                <Label htmlFor="classroomJson">Classroom JSON</Label>
                <Textarea
                  id="classroomJson"
                  value={classroomJson}
                  onChange={(event) => setClassroomJson(event.target.value)}
                  className="min-h-52 resize-y font-mono text-xs"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={createEditPlan}
                disabled={isEditing || !editInstruction.trim() || !classroomJson.trim()}
                className="gap-2"
              >
                {isEditing ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />}
                Draft patches
              </Button>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
            </div>

            {editPlan && (
              <div className="mt-5 rounded-md border border-border">
                <div className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-medium">
                  {editPlan.summary}
                </div>
                <div className="divide-y divide-border">
                  {editPlan.patches.map((patch) => (
                    <article key={patch.id} className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">{patch.title}</h3>
                        <span className="shrink-0 rounded bg-muted px-2 py-1 text-xs">
                          {patch.operation}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{patch.rationale}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}

function buildHeadersWithoutContentType() {
  const { 'Content-Type': _contentType, ...headers } = buildHeaders();
  return headers;
}
