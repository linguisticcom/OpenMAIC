import { AccountAuthShell } from '@/components/tenant-portal/account-auth-shell';
import { SignupForm } from '@/components/tenant-portal/signup-form';
import { listCoursePortalCards } from '@/lib/server/course-portal-data';

export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  const cards = await listCoursePortalCards();

  return (
    <AccountAuthShell
      label="Learner signup"
      title="Create your LC Academy learner account."
      description="Learner accounts are created only after a valid organization course access code is verified."
    >
      <SignupForm
        courses={cards.map((card) => ({
          organizationSlug: card.university.slug,
          organizationName: card.university.name,
          courseSlug: card.course.slug,
          courseTitle: card.course.title,
        }))}
      />
    </AccountAuthShell>
  );
}
