'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState, useEffect } from 'react';
import { useFileSystem } from '@/hooks/useFileSystem';

// Import components from the barrel export
import DirectorySelector from '@/components/share/DirectorySelector';
import { Toaster } from '@/components/ui/toast/toaster';
import { toast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

const FileExplorer = dynamic(() => import('@/components/share/FileExplorer'), { ssr: false });

export default function ShareView({ id }: { id: string }) {
  const t = useTranslations('ShareView');
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
    // 检查是否支持文件系统访问 API
    if (!isFileSystemAccessSupported()) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <h2 className="text-2xl font-semibold">{t('unsupported.title')}</h2>
          <p className="text-gray-600 text-center max-w-md">
            {t('unsupported.description')}
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
        {renderContent()}
      </div>
      <Toaster />
    </div>
  );
} 