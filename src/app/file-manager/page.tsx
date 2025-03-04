'use client';

import { useEffect } from 'react';
import FileManager from '@/components/FileManager';
import useFileSystemStore, { FSFile } from '@/store/fileSystemStore';

declare global {
  interface Window {
    showDirectoryPicker: () =>Promise<FileSystemDirectoryHandle>;
  }
}

export default function FileManagerPage() {
  const { rootDir, setRootDir, selectDirectory } = useFileSystemStore();

  const handleRootDirSelect = async () => {
    const rootDirHandle = await window.showDirectoryPicker();
    setRootDir(rootDirHandle);
    await selectDirectory('/');
  };
  
  const handleFileSelect = (file: FSFile) => {
    console.log('Selected file:', file);
    // 这里可以添加其他处理逻辑，如打开文件预览等
  };

  if (!rootDir) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">文件管理器示例</h1>
        <p>请选择一个目录</p>
        <button className="bg-blue-500 text-white px-4 py-2 rounded-md" onClick={handleRootDirSelect}>选择目录</button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">文件管理器示例</h1>
      <FileManager 
        initialPath="/" 
        onFileSelect={handleFileSelect} 
      />
    </div>
  );
} 