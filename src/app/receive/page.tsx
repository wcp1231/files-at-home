'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileViewEntry } from '@/components/FileBrowser';

// Import components from the barrel export
import {
  ConnectionPanel,
  FileBrowserWrapper
} from '@/components/receive';

export default function ReceivePage() {
  const searchParams = useSearchParams();
  const initialConnectionId = searchParams.get('id') || undefined;
  
  const [fileSelectHandler, setFileSelectHandler] = useState<((path: string) => Promise<FileViewEntry | null>) | null>(null);
  const [directorySelectHandler, setDirectorySelectHandler] = useState<((path: string) => Promise<FileViewEntry[]>) | null>(null);
  
  // 当连接成功时，设置文件和目录处理函数
  const handleConnected = useCallback((
    handleFileSelect: (path: string) => Promise<FileViewEntry | null>,
    handleDirectorySelect: (path: string) => Promise<FileViewEntry[]>
  ) => {
    setFileSelectHandler(() => handleFileSelect);
    setDirectorySelectHandler(() => handleDirectorySelect);
  }, []);
  
  // 渲染内容
  const renderContent = () => {
    // 如果已连接并且有处理函数，显示文件浏览器
    if (fileSelectHandler && directorySelectHandler) {
      return (
        <FileBrowserWrapper
          handleFileSelect={fileSelectHandler}
          handleDirectorySelect={directorySelectHandler}
        />
      );
    }
    
    // 否则只显示连接面板
    return null;
  };
  
  return (
    <div className="container max-w-8xl mx-auto py-8 px-4">
      <div className="space-y-6">
        <ConnectionPanel
          initialConnectionId={initialConnectionId}
          onConnected={handleConnected}
        />
        
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