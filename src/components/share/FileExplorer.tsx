import React, { useEffect } from 'react';
import { FileBrowser, useFileBrowserStore } from '@/components/filebrowser';
import { FSEntry, FSFile, FSDirectory } from '@/lib/filesystem';
import FlatConnectionPanel from './FlatConnectionPanel';
import { useWebRTCHostStore } from '@/store/webrtcHostStore';

interface FileExplorerProps {
  id: string;
  rootDirHandle: FileSystemDirectoryHandle | null;
  getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>;
  getFile: (path: string) => Promise<FSFile | null>;
  listFiles: (path: string) => Promise<FSEntry[] | null>;
}

export default function FileExplorer({ id, rootDirHandle, getDirectory, getFile, listFiles }: FileExplorerProps) {
  const { setPeerId, setFilesystemHandlers, getFile: getFileFromStore } = useWebRTCHostStore();
  const { initialize } = useFileBrowserStore();

  setPeerId(id);

  useEffect(() => {
    setFilesystemHandlers(getDirectory, getFile, listFiles);
    initialize('/');
  }, []);

  if (!rootDirHandle || !getFileFromStore) {
    return null;
  }

  return (
    <>
      <div className="h-full">
        <FileBrowser
          titlePanel={
            <FlatConnectionPanel />
          }
        />
      </div>
    </>
  );
} 