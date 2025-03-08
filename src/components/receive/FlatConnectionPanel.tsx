import React, { useEffect, useState, useRef } from 'react';
import { Link2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectionState, SharedFileInfo } from '@/lib/webrtc';
import { useWebRTCClient } from '@/hooks/useWebRTCClient';
import { FileViewEntry } from '@/components/filebrowser/FileBrowser';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface FlatConnectionPanelProps {
  initialConnectionId?: string;
  onConnected: (
    handleFileSelect: (path: string) => Promise<FileViewEntry | null>,
    handleFileData: (path: string) => Promise<Blob | null>,
    handleDirectorySelect: (path: string) => Promise<FileViewEntry[]>
  ) => void;
  onDisconnected: () => void;
}

// 使用模块级变量来跟踪连接状态，确保它在组件重新渲染或卸载时不会重置
let isConnectionInitialized = false;

export default function FlatConnectionPanel({ 
  initialConnectionId,
  onConnected,
  onDisconnected
}: FlatConnectionPanelProps) {
  const {
    connectionState,
    error,
    initializeClient,
    disconnect,
    requestFile,
    requestFileData,
    requestDirectory
  } = useWebRTCClient();
  
  // 存储连接ID和用户输入的连接ID
  const [hostConnectionId, setHostConnectionId] = useState<string | null>(null);
  const [connectionIdInput, setConnectionIdInput] = useState<string>('');
  
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
    const file = await requestFile(path);
    return mapFSEntryToFileEntry(file);
  };

  // 处理文件数据请求
  const handleFileData = async (path: string) => {
    const file = await requestFileData(path);
    return file;
  };

  // 处理目录请求
  const handleDirectorySelect = async (path: string) => {
    const files = await requestDirectory(path);
    return files.map(mapFSEntryToFileEntry).filter((file): file is FileViewEntry => file !== null);
  };

  // 创建一个自定义的断开连接函数，它会重置连接初始化标志
  const handleDisconnect = () => {
    disconnect();
    isConnectionInitialized = false;
  };

  // 连接到主机
  const handleConnect = (id: string) => {
    if (!id) return;
    
    // 尝试从URL提取连接ID
    let connectionId = id;
    try {
      if (id.includes('?id=')) {
        const url = new URL(id);
        const params = new URLSearchParams(url.search);
        const extractedId = params.get('id');
        if (extractedId) {
          connectionId = extractedId;
        }
      }
    } catch (e) {
      // 如果解析失败，使用原始输入
      console.log('无法解析URL，使用原始输入作为连接ID');
    }
    
    if (!isConnectionInitialized) {
      isConnectionInitialized = true;
      
      // 保存连接ID
      setHostConnectionId(connectionId);
      
      initializeClient(connectionId);
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
      onConnected(handleFileSelect, handleFileData, handleDirectorySelect);
    } else if (connectionState === ConnectionState.DISCONNECTED) {
      onDisconnected();
    }
  }, [connectionState, onConnected, onDisconnected]);
  
  // 获取按钮状态和标签
  const getButtonProps = () => {
    switch (connectionState) {
      case ConnectionState.INITIALIZING:
        return {
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
          label: '初始化中...',
          variant: 'outline',
          disabled: true
        };
      case ConnectionState.CONNECTING:
        return {
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
          label: '连接中...',
          variant: 'outline',
          disabled: true
        };
      case ConnectionState.CONNECTED:
        return {
          icon: <Link2 className="h-3.5 w-3.5" />,
          label: '已连接',
          variant: 'default',
          disabled: false
        };
      case ConnectionState.DISCONNECTED:
      default:
        return {
          icon: <Link2 className="h-3.5 w-3.5" />,
          label: '连接',
          variant: 'outline',
          disabled: false
        };
    }
  };

  const buttonProps = getButtonProps();
  const isConnected = connectionState === ConnectionState.CONNECTED;

  return (
    <div className="flex items-center space-x-2">
      {error && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-destructive cursor-pointer">
                <AlertCircle className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{error}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={buttonProps.variant as any}
            className="h-7 px-2 text-xs"
            disabled={buttonProps.disabled}
          >
            {buttonProps.icon}
            <span className="ml-1">{buttonProps.label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3 mt-1">
          {isConnected ? (
            <div className="space-y-3">
              <div className="flex flex-col">
                <p className="text-sm font-medium mb-1">已连接到远程分享</p>
                {hostConnectionId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ID: <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">{hostConnectionId}</span>
                  </p>
                )}
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full h-7 text-xs"
                onClick={handleDisconnect}
              >
                断开连接
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs">输入连接 ID 或粘贴分享链接</p>
              <div className="flex items-center space-x-2">
                <Input 
                  value={connectionIdInput}
                  onChange={(e) => setConnectionIdInput(e.target.value)}
                  placeholder="Connection ID"
                  className="h-7 text-xs"
                />
                <Button 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => handleConnect(connectionIdInput)}
                  disabled={!connectionIdInput}
                >
                  连接
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
} 