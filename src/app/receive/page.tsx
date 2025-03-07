'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileBrowserWrapper } from '@/components/receive';
import { WorkerManager } from '@/lib/webrtc/client/worker';

if (typeof window !== 'undefined') {
  WorkerManager.register();
}

export default function ReceivePage() {
  const searchParams = useSearchParams();
  const initialConnectionId = searchParams.get('id') || undefined;
  
  return (
    <div className="container max-w-8xl mx-auto py-8 px-4">
      <div className="space-y-6">
        <FileBrowserWrapper initialConnectionId={initialConnectionId}/>
      </div>
      
      <div className="text-center mt-8">
        <Button variant="link" asChild>
          <Link href="/">
            返回首页
          </Link>
        </Button>
      </div>
    </div>
  );
} 