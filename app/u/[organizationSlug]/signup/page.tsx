import { notFound } from 'next/navigation';
import { AccountAuthShell } from '@/components/tenant-portal/account-auth-shell';
import { SignupForm } from '@/components/tenant-portal/signup-form';
import { getOrganizationBySlug, listCoursePortalCards } from '@/lib/server/course-portal-data';

export const dynamic = 'force-dynamic';

export default async function OrganizationSignupPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  const organization = await getOrganizationBySlug(organizationSlug);
  if (!organization) notFound();
  const cards = await listCoursePortalCards({ organizationId: organization.id });

  return (
    <AccountAuthShell
      label={`${organization.name} learner signup`}
      title="Create your LC Academy learner account."
      description="Use the access code provided by your institution to link your learner account to the assigned course."
    >
      <SignupForm
        organizationSlug={organization.slug}
        courses={cards.map((card) => ({
          organizationSlug: organization.slug,
          organizationName: organization.name,
          courseSlug: card.course.slug,
          courseTitle: card.course.title,
        }))}
      />
    </AccountAuthShell>
  );
}
