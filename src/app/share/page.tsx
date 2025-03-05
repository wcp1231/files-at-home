'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useFileSystem } from '@/hooks/useFileSystem';
import { ConnectionState } from '@/lib/webrtc';
import { useWebRTCHost } from '@/hooks/useWebRTCHost';
import { Button } from '@/components/ui/button';

// Import components from the barrel export
import {
  ShareHeader,
  DirectorySelector,
  ConnectionInfo,
  FileExplorer,
  ConnectingIndicator
} from '@/components/share';

export default function SharePage() {
  const [shareUrl, setShareUrl] = useState('');

  const {
    rootDirHandle,
    openDirectory,
    getFile,
    listFiles,
    getDirectory,
  } = useFileSystem();

  const {
    connectionState,
    connectionId,
    error,
    initializeHost,
    disconnect
  } = useWebRTCHost({ getDirectory, getFile });
  
  // 当连接 ID 变化时更新分享 URL
  useEffect(() => {
    if (connectionId) {
      const url = `${window.location.origin}/receive?id=${connectionId}`;
      setShareUrl(url);
    } else {
      setShareUrl('');
    }
  }, [connectionId]);
  
  // 选择目录 - 使用 useCallback 优化
  const handleSelectDirectory = useCallback(async () => {
    try {
      await openDirectory();
      // 设置文件系统的根目录
      await initializeHost()
    } catch (err) {
      console.error('Failed to select directory:', err);
    }
  }, [openDirectory, initializeHost]);
  
  // 根据连接状态渲染不同的内容
  const renderContent = () => {
    if (connectionState === ConnectionState.DISCONNECTED) {
      return <DirectorySelector onSelectDirectory={handleSelectDirectory} />;
    }
    
    if (connectionState === ConnectionState.CONNECTING && !connectionId) {
      return <ConnectingIndicator />;
    }
    
    if (connectionState === ConnectionState.CONNECTED || 
        (connectionState === ConnectionState.CONNECTING && connectionId)) {
      return (
        <>
          <ConnectionInfo 
            connectionId={connectionId} 
            shareUrl={shareUrl} 
            onDisconnect={disconnect} 
          />
          
          <FileExplorer 
            rootDirHandle={rootDirHandle} 
            getFile={getFile} 
            listFiles={listFiles} 
          />
        </>
      );
    }
    
    return null;
  };
  
  return (
    <div className="container max-w-8xl mx-auto py-8 px-4">
      <ShareHeader error={error} />
      
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