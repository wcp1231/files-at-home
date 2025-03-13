import React from 'react';
import { FileBrowser } from '@/components/filebrowser';
import FlatConnectionPanel from './FlatConnectionPanel';
import NetworkSpeedDisplay from './NetworkSpeedDisplay';
import { PassphraseDialog } from '../PassphraseDialog';

interface FileBrowserWrapperProps {
  initialConnectionId?: string;
}

export default function FileBrowserWrapper({initialConnectionId}: FileBrowserWrapperProps) {
  return (
    <div className="h-[calc(100dvh-2rem)]">
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
      <PassphraseDialog />
    </div>
  );
} 