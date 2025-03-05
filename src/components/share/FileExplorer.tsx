import React, { useState } from 'react';
import FileBrowser, { FileViewEntry } from '@/components/FileBrowser';
import { FSEntry, FSFile } from '@/lib/filesystem';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface FileExplorerProps {
  rootDirHandle: FileSystemDirectoryHandle | null;
  getFile: (path: string) => Promise<FSFile | null>;
  listFiles: (path: string) => Promise<FSEntry[] | undefined>;
}

export default function FileExplorer({ rootDirHandle, getFile, listFiles }: FileExplorerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setIsLoading(true);
    setError(null);
    try {
      const file = await getFile(path);
      return mapFSEntryToFileEntry(file);
    } catch (err) {
      console.error('Error selecting file:', err);
      setError('无法加载文件');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 处理本地目录导航
  const handleDirectorySelect = async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const files = await listFiles(path);
      if (!files) return [];  
      return files.map(mapFSEntryToFileEntry).filter((file): file is FileViewEntry => file !== null);
    } catch (err) {
      console.error('Error listing directory:', err);
      setError('无法加载目录内容');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

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
        initialPath={rootDirHandle ? "/" : ""}
        onFileSelect={handleFileSelect}
        onDirectorySelect={handleDirectorySelect}
      />
    </>
  );
} 