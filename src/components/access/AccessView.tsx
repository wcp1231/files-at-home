'use client';

import dynamic from 'next/dynamic';
import { WorkerManager } from '@/lib/webrtc/client/worker';
import { Toaster } from "@/components/ui/toast/toaster"

const FileBrowserWrapper = dynamic(() => import('@/components/access/FileBrowserWrapper'), { ssr: false });
if (typeof window !== 'undefined') {
  WorkerManager.register();
}

export default function AccessView({ id }: { id?: string }) {
  return (
    <div className="max-w-8xl mx-auto pt-4 px-4">
      <div className="space-y-6 h-[calc(100dvh-4rem)]">
        <FileBrowserWrapper initialConnectionId={id}/>
      </div>
      <Toaster />
    </div>
  );
} 