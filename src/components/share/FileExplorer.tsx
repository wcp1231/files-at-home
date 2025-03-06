import React, { useEffect, useState } from 'react';
import { FileBrowser, useFileBrowserStore, type FileViewEntry } from '@/components/filebrowser';
import { FSEntry, FSFile, FSDirectory } from '@/lib/filesystem';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import FlatConnectionPanel from './FlatConnectionPanel';

interface FileExplorerProps {
  rootDirHandle: FileSystemDirectoryHandle | null;
  getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>;
  getFile: (path: string) => Promise<FSFile | null>;
  listFiles: (path: string) => Promise<FSEntry[] | undefined>;
}

export default function FileExplorer({ rootDirHandle, getDirectory, getFile, listFiles }: FileExplorerProps) {
  const [error, setError] = useState<string | null>(null);
  const store = useFileBrowserStore();

  // 将FSEntry映射到FileEntry
  const mapFSEntryToFileEntry = (entry: FSEntry | null): FileViewEntry | null => {
    if (!entry) {
      return null;
    }
    return {
      name: entry.name,
      path: entry.path,
      size: entry instanceof FSFile ? entry.size : undefined,
      type: entry instanceof FSFile ? entry.type : undefined,
      modifiedAt: entry instanceof FSFile ? entry.modifiedAt : undefined,
      isDirectory: !(entry instanceof FSFile)
    };
  };

  // 处理本地文件浏览
  const handleFileSelect = async (path: string) => {
    setError(null);
    try {
      const file = await getFile(path);
      return mapFSEntryToFileEntry(file);
    } catch (err) {
      console.error('Error selecting file:', err);
      setError('无法加载文件');
      return null;
    }
  };

  // 处理本地目录导航
  const handleDirectorySelect = async (path: string) => {
    setError(null);
    try {
      const files = await listFiles(path);
      if (!files) return [];  
      return files.map(mapFSEntryToFileEntry).filter((file): file is FileViewEntry => file !== null);
    } catch (err) {
      console.error('Error listing directory:', err);
      setError('无法加载目录内容');
      return [];
    }
  };

  useEffect(() => {
    store.setCallbacks({
      onFileSelect: handleFileSelect,
      onDirectorySelect: handleDirectorySelect,
      renderFileIcon: undefined
    });
    store.initialize('/');
  }, []);

  if (!rootDirHandle) {
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
          <FlatConnectionPanel 
            getDirectory={getDirectory}
            getFile={getFile}
          />
        }
      />
    </>
  );
} 