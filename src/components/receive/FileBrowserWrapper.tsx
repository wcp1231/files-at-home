import React, { useCallback, useState } from 'react';
import FileBrowser, { FileViewEntry } from '@/components/filebrowser';
import FlatConnectionPanel from './FlatConnectionPanel';

interface FileBrowserWrapperProps {
  initialConnectionId?: string;
}

export default function FileBrowserWrapper({initialConnectionId}: FileBrowserWrapperProps) {
  const [fileSelectHandler, setFileSelectHandler] = useState<((path: string) => Promise<FileViewEntry | null>) | undefined>();
  const [fileDataHandler, setFileDataHandler] = useState<((path: string) => Promise<FileViewEntry | null>) | undefined>();
  const [directorySelectHandler, setDirectorySelectHandler] = useState<((path: string) => Promise<FileViewEntry[]>) | undefined>();

  // 当连接成功时，设置文件和目录处理函数
  const handleConnected = useCallback((
    handleFileSelect: (path: string) => Promise<FileViewEntry | null>,
    handleFileData: (path: string) => Promise<FileViewEntry | null>,
    handleDirectorySelect: (path: string) => Promise<FileViewEntry[]>
  ) => {
    setFileSelectHandler(() => handleFileSelect);
    setFileDataHandler(() => handleFileData);
    setDirectorySelectHandler(() => handleDirectorySelect);
  }, []);

  const handleDisconnected = useCallback(() => {
    setFileSelectHandler(undefined);
    setDirectorySelectHandler(undefined);
    setFileDataHandler(undefined);
  }, []);

  return (
    <div className="mb-6">
      <FileBrowser
        initialPath={directorySelectHandler ? "/" : ""}
        onFileSelect={fileSelectHandler}
        onFileData={fileDataHandler}
        onDirectorySelect={directorySelectHandler}
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