
import AccessView from '@/components/access/AccessView';

export default async function AccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AccessView id={id} />
  );
} 