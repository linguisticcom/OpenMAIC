import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Building2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOrganizationBySlug, listCoursePortalCards } from '@/lib/server/course-portal-data';

export const dynamic = 'force-dynamic';

export default async function PublicOrganizationPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  const organization = await getOrganizationBySlug(organizationSlug);
  if (!organization) notFound();

  const cards = await listCoursePortalCards({ organizationId: organization.id });

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href={`/u/${organization.slug}`} className="flex items-center gap-3">
            <img
              src={organization.logoUrl || '/logo-horizontal.png'}
              alt=""
              className="h-10 w-auto"
            />
            <span className="hidden text-sm font-semibold text-slate-600 sm:inline">
              {organization.name}
            </span>
          </Link>
          <Button asChild className="bg-violet-700 text-white hover:bg-violet-800">
            <Link href={`/u/${organization.slug}/courses`}>View courses</Link>
          </Button>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-violet-700">
            <Building2 className="size-4" />
            University portal
          </p>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-normal">
            {organization.name}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            {organization.welcomeMessage || organization.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-violet-700 text-white hover:bg-violet-800">
              <Link href={`/u/${organization.slug}/courses`}>
                Browse courses
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/u/${organization.slug}/access`}>Enter access code</Link>
            </Button>
          </div>
        </div>
        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-violet-50 p-2 text-violet-700">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-950">{cards.length} assigned courses</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Access is scoped to {organization.name} and checked server-side.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
