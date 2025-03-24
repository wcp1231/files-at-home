import React from 'react';
import { FileBrowser, useFileBrowserStore } from '@/components/filebrowser';
import FlatConnectionPanel from './FlatConnectionPanel';
import NetworkSpeedDisplay from './NetworkSpeedDisplay';
import { PassphraseDialog } from '../PassphraseDialog';
import WorkerStatusTooltip from './WorkerStatusTooltip';
import { FileUploadDialog } from './FileUploadDialog';

interface FileBrowserWrapperProps {
  initialConnectionId?: string;
}

export default function FileBrowserWrapper({initialConnectionId}: FileBrowserWrapperProps) {
  const { uploadable } = useFileBrowserStore();
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);

  return (
    <div className="h-full">
      <FileBrowser
        titlePanel={
          <div className="flex items-center justify-between w-full gap-2">
            <WorkerStatusTooltip />
            { uploadable && <FileUploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />}
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