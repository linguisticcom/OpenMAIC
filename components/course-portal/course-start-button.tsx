'use client';

import Link from 'next/link';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CourseStartButtonProps = {
  href: string;
  organizationId: string;
  courseId: string;
};

export function CourseStartButton({ href, organizationId, courseId }: CourseStartButtonProps) {
  function trackCourseStart() {
    const body = JSON.stringify({
      organizationId,
      courseId,
      action: 'course.started',
      metadata: { source: 'course-detail' },
      progressPercentage: 1,
    });

    // Course access should keep working even when analytics is unavailable.
    const beaconPayload = new Blob([body], { type: 'application/json' });
    if (
      typeof navigator.sendBeacon === 'function' &&
      navigator.sendBeacon('/api/organization/activity', beaconPayload)
    ) {
      return;
    }

    void fetch('/api/organization/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }

  return (
    <Button asChild className="min-h-10 w-full bg-violet-700 text-white hover:bg-violet-800">
      <Link href={href} onClick={trackCourseStart}>
        <PlayCircle className="size-4" />
        Start course
        <ArrowRight className="size-4" />
      </Link>
    </Button>
  );
}
