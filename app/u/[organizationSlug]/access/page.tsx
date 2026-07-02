import { notFound } from 'next/navigation';
import { PublicAccessForm } from '@/components/tenant-portal/public-access-form';
import { getOrganizationBySlug, listCoursePortalCards } from '@/lib/server/course-portal-data';

export const dynamic = 'force-dynamic';

export default async function PublicOrganizationAccessPage({
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
      <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-8 px-5 py-10 lg:grid-cols-[1fr_420px]">
        <section>
          <img
            src={organization.logoUrl || '/logo-horizontal.png'}
            alt=""
            className="h-12 w-auto"
          />
          <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-violet-700">
            {organization.name}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal">
            Enter your course access code.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            The code will be validated against this organization, its assigned courses, expiration,
            active status, and usage limits.
          </p>
        </section>
        <PublicAccessForm
          organizationSlug={organization.slug}
          courses={cards.map((card) => ({ slug: card.course.slug, title: card.course.title }))}
        />
      </div>
    </main>
  );
}
