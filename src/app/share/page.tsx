'use client';

import dynamic from 'next/dynamic';
import { useCallback } from 'react';
import { useFileSystem } from '@/hooks/useFileSystem';

// Import components from the barrel export
import DirectorySelector from '@/components/share/DirectorySelector';

const FileExplorer = dynamic(() => import('@/components/share/FileExplorer'), { ssr: false });

export default function SharePage() {
  const {
    rootDirHandle,
    openDirectory,
    getFile,
    listFiles,
    getDirectory,
  } = useFileSystem();
  
  // 选择目录 - 使用 useCallback 优化
  const handleSelectDirectory = useCallback(async () => {
    try {
      // 打开目录
      await openDirectory();
    } catch (err) {
      console.error('Failed to select directory:', err);
    }
  }, [openDirectory]);
  
  // 渲染内容
  const renderContent = () => {
    // 如果没有选择目录，显示目录选择器
    if (!rootDirHandle) {
      return <DirectorySelector onSelectDirectory={handleSelectDirectory} />;
    }
    
    // 一旦有了目录，就显示文件浏览器和连接信息
    return (
      <FileExplorer 
        rootDirHandle={rootDirHandle}
        getDirectory={getDirectory}
        getFile={getFile} 
        listFiles={listFiles} 
      />
    );
  };
  
  return (
    <div className="container max-w-8xl mx-auto py-4 px-4">
      <div className="space-y-6">
        {renderContent()}
      </div>
    </div>
  );
} 