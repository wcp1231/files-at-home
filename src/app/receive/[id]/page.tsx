
import ReceiveView from '@/components/receive/ReceiveView';

export default async function ReceivePage({ params }: any) {
  const { id } = await params;
  return (
    <ReceiveView id={id} />
  );
} 