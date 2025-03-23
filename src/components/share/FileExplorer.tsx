import React, { useEffect } from 'react';
import { FileBrowser, useFileBrowserStore } from '@/components/filebrowser';
import { FSEntry, FSFile, FSDirectory } from '@/lib/filesystem';
import FlatConnectionPanel from './FlatConnectionPanel';
import { useWebRTCHostStore } from '@/store/webrtcHostStore';
import { Button } from '../ui/button';
import { DynamicIcon } from 'lucide-react/dynamic';
import ConnectionsDialog from './ConnectionsDialog';

interface FileExplorerProps {
  id: string;
  isInitialized: boolean;
  getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>;
  getFile: (path: string) => Promise<FSFile | null>;
  listFiles: (path: string) => Promise<FSEntry[] | null>;
  onClose: () => void;
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center space-x-2">
      <Button 
      size="sm"
      variant='outline'
      className="h-7 px-1 text-xs"
      onClick={onClose}>
        <DynamicIcon name="x" className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function FileExplorer({ id, isInitialized, getDirectory, getFile, listFiles, onClose }: FileExplorerProps) {
  const { setPeerId, setFilesystemHandlers, getFile: getFileFromStore } = useWebRTCHostStore();
  const { initialize, setRole } = useFileBrowserStore();

  setPeerId(id);

  useEffect(() => {
    setFilesystemHandlers(getDirectory, getFile, listFiles);
    setRole('share');
    initialize('/');
  }, []);

  if (!isInitialized || !getFileFromStore) {
    return null;
  }

  return (
    <>
      <div className="h-full">
        <FileBrowser
          titlePanel={
            <div className="flex items-center justify-between w-full gap-2">
              <ConnectionsDialog />
              <FlatConnectionPanel />
              <CloseButton onClose={onClose} />
            </div>
          }
        />
      </div>
    </>
  );
} 