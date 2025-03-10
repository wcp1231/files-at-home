import React from 'react';
import { FileBrowser } from '@/components/filebrowser';
import FlatConnectionPanel from './FlatConnectionPanel';

interface FileBrowserWrapperProps {
  initialConnectionId?: string;
}

export default function FileBrowserWrapper({initialConnectionId}: FileBrowserWrapperProps) {
  return (
    <div className="mb-6 h-[calc(100dvh-5rem)]">
      <FileBrowser
        titlePanel={
          <FlatConnectionPanel 
            initialConnectionId={initialConnectionId}
          />
        }
      />
    </div>
  );
} 