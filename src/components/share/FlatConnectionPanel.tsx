import React, { useEffect, useState } from 'react';
import { DynamicIcon } from 'lucide-react/dynamic'
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

// 错误提示组件
interface ErrorTooltipProps {
  error: string | null;
}

const ErrorTooltip = ({ error }: ErrorTooltipProps) => {
  if (!error) return null;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-destructive cursor-pointer">
            <DynamicIcon name="alert-circle" className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{error}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// 获取按钮状态和标签
const getConnectionButtonProps = (connectionState: ConnectionState) => {
  switch (connectionState) {
    case ConnectionState.INITIALIZING:
      return {
        icon: <DynamicIcon name="loader-2" className="h-3.5 w-3.5 animate-spin" />,
        label: '初始化中...',
        disabled: true
      };
    default:
      return {
        icon: <DynamicIcon name="link-2" className="h-3.5 w-3.5" />,
        label: '初始化连接',
        disabled: false
      };
  }
};

// 获取按钮状态和标签
const getStatusButtonProps = (connectionState: ConnectionState) => {
  switch (connectionState) {
    case ConnectionState.INITIALIZING:
      return {
        icon: <DynamicIcon name="loader-2" className="h-3.5 w-3.5 animate-spin" />,
        label: '初始化中...',
        variant: 'outline',
        disabled: true
      };
    case ConnectionState.CONNECTING:
      return {
        icon: <DynamicIcon name="loader-2" className="h-3.5 w-3.5 animate-spin" />,
        label: '连接中...',
        variant: 'outline',
        disabled: true
      };
    case ConnectionState.WAITING_FOR_CONNECTION:
      return {
        icon: <DynamicIcon name="link-2" className="h-3.5 w-3.5" />,
        label: '等待连接',
        variant: 'secondary',
        disabled: false
      };
    case ConnectionState.CONNECTED:
      return {
        icon: <DynamicIcon name="link-2" className="h-3.5 w-3.5" />,
        label: '已连接',
        variant: 'default',
        disabled: false
      };
    case ConnectionState.DISCONNECTED:
    default:
      return {
        icon: <DynamicIcon name="link-2" className="h-3.5 w-3.5" />,
        label: '分享',
        variant: 'outline',
        disabled: false
      };
  }
};

const ConnectedPopoverContent = () => {
  const {
    peerId,
    encryptionPassphrase,
    disconnect
  } = useWebRTCHostStore();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // 当连接 ID 变化时更新分享 URL
  useEffect(() => {
    if (peerId) {
      const url = `${window.location.origin}/receive/${peerId}`;
      setShareUrl(url);
    } else {
      setShareUrl('');
    }
  }, [peerId]);

  // 复制链接
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col">
        <p className="text-sm font-medium mb-1">分享链接</p>
        {peerId && (
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
                <DynamicIcon name="check" className="h-3.5 w-3.5 text-green-500" /> : 
                <DynamicIcon name="copy" className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )}
        {encryptionPassphrase && (
          <>
            <p className="text-sm font-medium mb-1">连接密码</p>
            <div className="flex items-center space-x-1">
              <Input 
                value={encryptionPassphrase || ''} 
                readOnly 
                className="h-7 text-xs" 
              />
            </div>
          </>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          ID: <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">{peerId}</span>
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
  );
};

const DisconnectedPopoverContent = () => {
  const { connectionState, initializeHost } = useWebRTCHostStore();
  const [passphrase, setPassphrase] = useState('');
  const [buttonProps, setButtonProps] = useState(getConnectionButtonProps(connectionState));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await initializeHost(passphrase)
  };

  useEffect(() => {
    setButtonProps(getConnectionButtonProps(connectionState));
  }, [connectionState]);
  
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs">初始化分享连接，让远程设备访问你的文件</p>
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="设置连接密码（可选）"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          className="h-7 text-xs"
        />
        <Button 
          type="submit"
          size="sm" 
          className="w-full h-7 text-xs"
          disabled={buttonProps.disabled}
        >
          {buttonProps.icon}
          <span className="ml-1">{buttonProps.label}</span>
        </Button>
      </div>
    </form>
  );
};

export default function FlatConnectionPanel() {
  // 使用 useWebRTCHost hook 管理 WebRTC 连接
  const {
    connectionState,
    error,
  } = useWebRTCHostStore();

  const isConnected = connectionState === ConnectionState.CONNECTED || 
                       connectionState === ConnectionState.WAITING_FOR_CONNECTION;
  console.log('connectionState', connectionState, isConnected);

  const buttonProps = getStatusButtonProps(connectionState);
  return (
    <div className="flex items-center space-x-2">
      <ErrorTooltip error={error} />

      <Popover>
        <PopoverTrigger asChild>
        <Button
          size="sm"
          variant={buttonProps.variant as 'default' | 'outline'}
          className="h-7 px-2 text-xs"
          disabled={buttonProps.disabled}
        >
          {buttonProps.icon}
          <span className="ml-1">{buttonProps.label}</span>
        </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3 mt-1" align="end">
          {isConnected ? (
            <ConnectedPopoverContent />
          ) : (
            <DisconnectedPopoverContent />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
} 