import React from 'react';
import { FileBrowser } from '@/components/filebrowser';
import FlatConnectionPanel from './FlatConnectionPanel';
import NetworkSpeedDisplay from './NetworkSpeedDisplay';

interface FileBrowserWrapperProps {
  initialConnectionId?: string;
}

export default function FileBrowserWrapper({initialConnectionId}: FileBrowserWrapperProps) {
  return (
    <div className="mb-6 h-[calc(100dvh-5rem)]">
      <FileBrowser
        titlePanel={
          <div className="flex items-center justify-between w-full gap-2">
            <NetworkSpeedDisplay />
            <FlatConnectionPanel 
              initialConnectionId={initialConnectionId}
            />
          </div>
        }
      />
    </div>
  );
} 