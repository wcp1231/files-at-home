'use client';

import dynamic from 'next/dynamic';
import { WorkerManager } from '@/lib/webrtc/client/worker';

const FileBrowserWrapper = dynamic(() => import('@/components/receive/FileBrowserWrapper'), { ssr: false });
if (typeof window !== 'undefined') {
  WorkerManager.register();
}

export default function ReceiveView({ id }: { id?: string }) {
  return (
    <div className="max-w-8xl mx-auto py-4 px-4">
      <div className="space-y-6">
        <FileBrowserWrapper initialConnectionId={id}/>
      </div>
    </div>
  );
} 