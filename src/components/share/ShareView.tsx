'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useFileSystem } from '@/hooks/useFileSystem';

// Import components from the barrel export
import { Toaster } from '@/components/ui/toast/toaster';

const FileExplorer = dynamic(() => import('@/components/share/FileExplorer'), { ssr: false });
const FileSystemSelector = dynamic(() => import('@/components/share/FileSystemSelector'), { ssr: false });

function RenderContent({ id }: { id: string }) {
  const {
    isInitialized,
    openDirectory,
    getFile,
    listFiles,
    getDirectory,
    onFilesSelected,
    isFileSystemAccessSupported,
    onClose,
  } = useFileSystem();

  // 如果没有选择目录，显示目录选择器
  if (!isInitialized) {
    return <FileSystemSelector openDirectory={openDirectory} onFilesSelected={onFilesSelected} isFileSystemAccessSupported={isFileSystemAccessSupported} />
  }
  
  // 一旦有了目录，就显示文件浏览器和连接信息
  return (
    <FileExplorer 
      id={id}
      isInitialized={isInitialized}
      getDirectory={getDirectory}
      getFile={getFile} 
      listFiles={listFiles} 
      onClose={onClose}
    />
  );
}

export default function ShareView({ id }: { id: string }) {
  // 确保在客户端渲染
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return null; // 或者返回一个加载占位符
  }
  
  return (
    <div className="max-w-8xl mx-auto pt-4 px-4">
      <div className="space-y-6 h-[calc(100dvh-4rem)]">
        <RenderContent id={id} />
      </div>
      <Toaster />
    </div>
  );
} 