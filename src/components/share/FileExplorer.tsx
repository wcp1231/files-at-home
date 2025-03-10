import React, { useEffect } from 'react';
import { FileBrowser, useFileBrowserStore } from '@/components/filebrowser';
import { FSEntry, FSFile, FSDirectory } from '@/lib/filesystem';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import FlatConnectionPanel from './FlatConnectionPanel';
import { useWebRTCHostStore } from '@/store/webrtcHostStore';

interface FileExplorerProps {
  rootDirHandle: FileSystemDirectoryHandle | null;
  getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>;
  getFile: (path: string) => Promise<FSFile | null>;
  listFiles: (path: string) => Promise<FSEntry[] | undefined>;
}

export default function FileExplorer({ rootDirHandle, getDirectory, getFile, listFiles }: FileExplorerProps) {
  const { error, setFilesystemHandlers, getFile: getFileFromStore } = useWebRTCHostStore();
  const { initialize } = useFileBrowserStore();

  useEffect(() => {
    setFilesystemHandlers(getDirectory, getFile, listFiles);
    initialize('/');
  }, []);

  if (!rootDirHandle || !getFileFromStore) {
    return null;
  }

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      <FileBrowser
        titlePanel={
          <FlatConnectionPanel />
        }
      />
    </>
  );
} 