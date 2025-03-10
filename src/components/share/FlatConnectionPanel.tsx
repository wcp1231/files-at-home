import React, { useEffect, useState } from 'react';
import { Link2, Copy, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectionState } from '@/lib/webrtc';
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
import { useWebRTCHostStore } from '@/store/webrtcHostStore';

interface FlatConnectionPanelProps {}

export default function FlatConnectionPanel({}: FlatConnectionPanelProps) {
  // 使用 useWebRTCHost hook 管理 WebRTC 连接
  const {
    connectionState,
    connectionId,
    error,
    initializeHost,
    disconnect
  } = useWebRTCHostStore();

  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // 当连接 ID 变化时更新分享 URL
  useEffect(() => {
    if (connectionId) {
      const url = `${window.location.origin}/receive?id=${connectionId}`;
      setShareUrl(url);
    } else {
      setShareUrl('');
    }
  }, [connectionId]);

  // 复制链接
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // 只在需要时初始化连接
  useEffect(() => {
    initializeHost()
    return () => {
      console.log('FlatConnectionPanel unmounting, but keeping initialization state');
    };
  }, [initializeHost]);

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
      case ConnectionState.WAITING_FOR_CONNECTION:
        return {
          icon: <Link2 className="h-3.5 w-3.5" />,
          label: '等待连接',
          variant: 'secondary',
          disabled: false
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
          label: '分享',
          variant: 'outline',
          disabled: false
        };
    }
  };

  const buttonProps = getButtonProps();
  const isConnected = connectionState === ConnectionState.CONNECTED || 
                       connectionState === ConnectionState.WAITING_FOR_CONNECTION;

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
        <PopoverContent className="w-80 p-3 mt-1" align="end">
          {isConnected ? (
            <div className="space-y-3">
              <div className="flex flex-col">
                <p className="text-sm font-medium mb-1">分享链接</p>
                {connectionId && (
                  <div className="flex items-center space-x-1">
                    <Input 
                      value={shareUrl} 
                      readOnly 
                      className="h-7 text-xs" 
                    />
                    <Button 
                      size="sm" 
                      className="p-0 w-7 h-7 flex items-center justify-center" 
                      variant="ghost"
                      onClick={handleCopyLink}
                    >
                      {copied ? 
                        <Check className="h-3.5 w-3.5 text-green-500" /> : 
                        <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  ID: <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">{connectionId}</span>
                </p>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full h-7 text-xs"
                onClick={disconnect}
              >
                断开连接
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs">初始化分享连接，让远程设备访问你的文件</p>
              <Button 
                size="sm" 
                className="w-full h-7 text-xs"
                onClick={() => initializeHost().catch(console.error)}
              >
                初始化连接
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
} 