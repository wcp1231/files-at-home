import React from 'react';
import { FileBrowser } from '@/components/filebrowser';
import FlatConnectionPanel from './FlatConnectionPanel';
import NetworkSpeedDisplay from './NetworkSpeedDisplay';
import { PassphraseDialog } from '../PassphraseDialog';
import WorkerStatusTooltip from './WorkerStatusTooltip';

interface FileBrowserWrapperProps {
  initialConnectionId?: string;
}

export default function FileBrowserWrapper({initialConnectionId}: FileBrowserWrapperProps) {
  return (
    <div className="h-full">
      <FileBrowser
        titlePanel={
          <div className="flex items-center justify-between w-full gap-2">
            <WorkerStatusTooltip />
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