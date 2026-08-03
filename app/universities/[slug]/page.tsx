import { permanentRedirect } from 'next/navigation';

interface UniversityPageProps {
  params: Promise<{ slug: string }>;
}

export default async function UniversityPage({ params }: UniversityPageProps) {
  const { slug } = await params;
  permanentRedirect(`/u/${encodeURIComponent(slug)}`);
}
