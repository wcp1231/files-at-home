import React, { useCallback } from 'react';
import { FileBrowser, useFileBrowserStore, type FileViewEntry } from '@/components/filebrowser';
import FlatConnectionPanel from './FlatConnectionPanel';

interface FileBrowserWrapperProps {
  initialConnectionId?: string;
}

export default function FileBrowserWrapper({initialConnectionId}: FileBrowserWrapperProps) {
  const { setCallbacks, initialize, cleanup } = useFileBrowserStore();

  // 当连接成功时，设置文件和目录处理函数
  const handleConnected = useCallback((
    handleFileSelect: (path: string) => Promise<FileViewEntry | null>,
    handleFileData: (path: string) => Promise<Blob | null>,
    handleDirectorySelect: (path: string) => Promise<FileViewEntry[]>
  ) => {
    setCallbacks({
      onFileSelect: handleFileSelect,
      onFileData: handleFileData,
      onDirectorySelect: handleDirectorySelect,
      renderFileIcon: undefined
    });
    initialize('/');
  }, [setCallbacks, initialize]);

  const handleDisconnected = useCallback(() => {
    setCallbacks({
      onFileSelect: undefined,
      onFileData: undefined,
      onDirectorySelect: undefined,
      renderFileIcon: undefined
    });
    cleanup();
  }, [setCallbacks, cleanup]);

  return (
    <div className="mb-6 h-[calc(100dvh-5rem)]">
      <FileBrowser
        titlePanel={
          <FlatConnectionPanel 
            initialConnectionId={initialConnectionId}
            onConnected={handleConnected}
            onDisconnected={handleDisconnected}
          />
        }
      />
    </div>
  );
} 