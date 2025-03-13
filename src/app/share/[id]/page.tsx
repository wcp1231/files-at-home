import { redirect } from 'next/navigation'
import ShareView from "@/components/share/ShareView";

export const dynamic = 'force-dynamic'

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id || !/^[1-9A-Za-z]{10}$/.test(id)) {
    redirect('/share');
  }
  
  return (
    <ShareView id={id} />
  );
} 