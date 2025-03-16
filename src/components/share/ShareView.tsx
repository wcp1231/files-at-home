'use client';

import dynamic from 'next/dynamic';
import { useCallback } from 'react';
import { useFileSystem } from '@/hooks/useFileSystem';

// Import components from the barrel export
import DirectorySelector from '@/components/share/DirectorySelector';
import { Toaster } from '@/components/ui/toast/toaster';
import { toast } from '@/hooks/use-toast';

const FileExplorer = dynamic(() => import('@/components/share/FileExplorer'), { ssr: false });

export default function ShareView({ id }: { id: string }) {
  const {
    rootDirHandle,
    openDirectory,
    getFile,
    listFiles,
    getDirectory,
    isFileSystemAccessSupported,
  } = useFileSystem();
  
  // 选择目录 - 使用 useCallback 优化
  const handleSelectDirectory = useCallback(async () => {
    try {
      // 打开目录
      await openDirectory();
    } catch (err) {
      toast({
        title: '无法选择目录',
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }, [openDirectory]);
  
  // 渲染内容
  const renderContent = () => {
    if (typeof window === 'undefined') {
      return null;
    }

    // 检查是否支持文件系统访问 API
    if (!isFileSystemAccessSupported()) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <h2 className="text-2xl font-semibold">不支持的浏览器或设备</h2>
          <p className="text-gray-600 text-center max-w-md">
            您当前的浏览器或设备不支持文件系统访问功能。请尝试使用最新版本的 Chrome、Edge 或其他支持文件系统访问的现代浏览器。如果问题仍然存在，请尝试使用其他设备。
          </p>
        </div>
      );
    }

    // 如果没有选择目录，显示目录选择器
    if (!rootDirHandle) {
      return <DirectorySelector onSelectDirectory={handleSelectDirectory} />;
    }
    
    // 一旦有了目录，就显示文件浏览器和连接信息
    return (
      <FileExplorer 
        id={id}
        rootDirHandle={rootDirHandle}
        getDirectory={getDirectory}
        getFile={getFile} 
        listFiles={listFiles} 
      />
    );
  };
  
  return (
    <div className="max-w-8xl mx-auto pt-4 px-4">
      <div className="space-y-6 h-[calc(100dvh-4rem)]">
        {renderContent()}
      </div>
      <Toaster />
    </div>
  );
} 