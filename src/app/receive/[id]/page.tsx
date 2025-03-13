
import ReceiveView from '@/components/receive/ReceiveView';

export default async function ReceivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ReceiveView id={id} />
  );
} 