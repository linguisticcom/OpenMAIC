'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Loader2, PenLine, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getCurrentModelConfig } from '@/lib/utils/model-config';
import type { ClassroomEditPlan, CoursePlan } from '@/lib/types/course-studio';

function buildHeaders() {
  const modelConfig = getCurrentModelConfig();
  return {
    'Content-Type': 'application/json',
    'x-model': modelConfig.modelString,
    'x-api-key': modelConfig.apiKey,
    'x-base-url': modelConfig.baseUrl,
    'x-provider-type': modelConfig.providerType || '',
  };
}

export default function CourseStudioPage() {
  const [topic, setTopic] = useState('Introduction to Artificial Intelligence');
  const [hours, setHours] = useState('15');
  const [moduleMinutes, setModuleMinutes] = useState('30');
  const [audience, setAudience] = useState('');
  const [resourcesSummary, setResourcesSummary] = useState('');
  const [coursePlan, setCoursePlan] = useState<CoursePlan | null>(null);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);

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
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Course planning failed');
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
        throw new Error(json.error || 'Classroom edit planning failed');
      }
      setEditPlan(json.plan);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              OpenMAIC
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Course Studio</h1>
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
                <Label htmlFor="resources">Resources summary</Label>
                <Textarea
                  id="resources"
                  value={resourcesSummary}
                  onChange={(event) => setResourcesSummary(event.target.value)}
                  className="min-h-28 resize-y"
                />
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
