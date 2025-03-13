'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { WorkerManager } from '@/lib/webrtc/client/worker';

const FileBrowserWrapper = dynamic(() => import('@/components/receive/FileBrowserWrapper'), { ssr: false });
if (typeof window !== 'undefined') {
  WorkerManager.register();
}

export default function ReceivePage() {
  const searchParams = useSearchParams();
  const initialConnectionId = searchParams.get('id') || undefined;
  
  return (
    <div className="max-w-8xl mx-auto py-4 px-4">
      <div className="space-y-6">
        <FileBrowserWrapper initialConnectionId={initialConnectionId}/>
      </div>
    </div>
  );
} 