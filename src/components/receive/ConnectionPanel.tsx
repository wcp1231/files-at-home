import React, { useEffect, useState } from 'react';
import { ConnectionState, SharedFileInfo } from '@/lib/webrtc';
import { useWebRTCClientStore } from '@/store/webrtcClientStore';
import { FileViewEntry } from '@/components/filebrowser';
import ConnectionInfo from '@/components/receive/ConnectionInfo';

interface ConnectionPanelProps {
  initialConnectionId?: string;
  onConnected: (
    handleFileSelect: (path: string) => Promise<FileViewEntry | null>,
    handleDirectorySelect: (path: string) => Promise<FileViewEntry[]>
  ) => void;
}

// 使用模块级变量来跟踪连接状态，确保它在组件重新渲染或卸载时不会重置
let isConnectionInitialized = false;

export default function ConnectionPanel({ 
  initialConnectionId,
  onConnected
}: ConnectionPanelProps) {
  const {
    connectionState,
    error,
    initializeClient,
    disconnect,
    requestFile,
    requestDirectory
  } = useWebRTCClientStore();
  
  // 存储连接ID
  const [hostConnectionId, setHostConnectionId] = useState<string | null>(null);

  // 将FSEntry映射到FileEntry
  const mapFSEntryToFileEntry = (entry: SharedFileInfo | null): FileViewEntry | null => {
    if (!entry) {
      return null;
    }
    return {
      name: entry.name,
      path: entry.path,
      size: entry.size,
      type: entry.type,
      modifiedAt: entry.modifiedAt,
      isDirectory: entry.isDirectory
    };
  };
  
  // 处理文件请求
  const handleFileSelect = async (path: string) => {
    return await requestFile(path);
  };

  // 处理目录请求
  const handleDirectorySelect = async (path: string) => {
    return await requestDirectory(path);
  };

  // 创建一个自定义的断开连接函数，它会重置连接初始化标志
  const handleDisconnect = () => {
    disconnect();
    isConnectionInitialized = false;
    console.log('Connection manually disconnected, reset initialization flag');
  };

  // 连接到主机
  const handleConnect = (id: string) => {
    if (!id) return;
    
    if (!isConnectionInitialized) {
      console.log('Initializing client connection');
      isConnectionInitialized = true;
      
      // 保存连接ID
      setHostConnectionId(id);
      
      initializeClient(id);
      
      // 注意：initializeClient 不返回 Promise，所以不能使用 catch
      // 如果需要处理错误，应该监听 error 状态变化
    }
  };

  // 如果提供了初始连接ID，则自动连接
  useEffect(() => {
    if (initialConnectionId && !isConnectionInitialized) {
      handleConnect(initialConnectionId);
    }
  }, [initialConnectionId]);

  // 当连接状态变为已连接时，调用onConnected回调
  useEffect(() => {
    if (connectionState === ConnectionState.CONNECTED) {
      onConnected(handleFileSelect, handleDirectorySelect);
    }
  }, [connectionState, onConnected]);

  return (
    <ConnectionInfo 
      error={error} 
      connectionState={connectionState} 
      connectionId={hostConnectionId} 
      disconnect={handleDisconnect} 
      connect={handleConnect} 
    />
  );
} 