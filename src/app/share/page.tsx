'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useFileSystem } from '@/hooks/useFileSystem';
import { Button } from '@/components/ui/button';

// Import components from the barrel export
import {
  DirectorySelector,
  ConnectionPanel,
  FileExplorer,
} from '@/components/share';

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
      <>
        {/* 连接信息组件 - 包含 WebRTC 连接管理和标题 */}
        <ConnectionPanel
          getDirectory={getDirectory}
          getFile={getFile}
        />
        
        {/* 文件浏览器组件 - 一旦选择了目录就显示 */}
        <FileExplorer 
          rootDirHandle={rootDirHandle} 
          getFile={getFile} 
          listFiles={listFiles} 
        />
      </>
    );
  };
  
  return (
    <div className="container max-w-8xl mx-auto py-8 px-4">
      <div className="space-y-6">
        {renderContent()}
      </div>
      
      <div className="text-center mt-8">
        <Button variant="link" asChild>
          <Link href="/">
            返回首页
          </Link>
        </Button>
      </div>
    </div>
  );
} 