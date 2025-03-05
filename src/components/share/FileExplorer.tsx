import React, { useState } from 'react';
import FileManager, { FileViewEntry } from '@/components/FileManager';
import { FSEntry, FSFile } from '@/lib/filesystem';

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
    <div className="mt-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">共享目录内容</h3>
        <div className="text-sm text-gray-600">
          目录: <span className="font-semibold">{`/`}</span>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <FileManager
        initialPath={rootDirHandle ? "/" : ""}
        onFileSelect={handleFileSelect}
        onDirectorySelect={handleDirectorySelect}
      />
    </div>
  );
} 