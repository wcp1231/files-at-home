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
import { useWebRTCClientStore } from '@/store/webrtcClientStore';

interface FlatConnectionPanelProps {
  initialConnectionId?: string;
}

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
        label: '连接中...',
        disabled: true
      };
    default:
      return {
        icon: <DynamicIcon name="link-2" className="h-3.5 w-3.5" />,
        label: '连接',
        disabled: false
      };
  }
};

// 获取按钮状态和标签
const getButtonProps = (connectionState: ConnectionState) => {
  switch (connectionState) {
    case ConnectionState.INITIALIZING:
      return {
        icon: <DynamicIcon name="loader-2" className="h-3.5 w-3.5 animate-spin" />,
        label: '初始化中...',
        variant: 'outline',
        disabled: true
      };
    case ConnectionState.CONNECTING:
    case ConnectionState.HANDSHAKING:
      return {
        icon: <DynamicIcon name="loader-2" className="h-3.5 w-3.5 animate-spin" />,
        label: '连接中...',
        variant: 'outline',
        disabled: true
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
        label: '连接',
        variant: 'outline',
        disabled: false
      };
  }
};

const ConnectedPopoverContent = () => {
  const { connectionId, disconnect } = useWebRTCClientStore();
  return (
    <div className="space-y-3">
      <div className="flex flex-col">
        <p className="text-sm font-medium mb-1">已连接到远程分享</p>
        {connectionId && (
          <p className="text-xs text-muted-foreground mt-1">
            ID: <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">{connectionId}</span>
          </p>
        )}
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
}
const DisconnectedPopoverContent = ({ initialConnectionId, handleConnect }: { initialConnectionId: string | undefined, handleConnect: (id: string) => void }) => {
  const { connectionState } = useWebRTCClientStore();
  const [connectionIdInput, setConnectionIdInput] = useState<string>(initialConnectionId || '');
  const [buttonProps, setButtonProps] = useState(getConnectionButtonProps(connectionState));


  useEffect(() => {
    setButtonProps(getConnectionButtonProps(connectionState));
  }, [connectionState]);

  
  return (
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
          disabled={!connectionIdInput || buttonProps.disabled}
        >
          {buttonProps.icon}
          <span className="ml-1">{buttonProps.label}</span>
        </Button>
      </div>
    </div>
  );
};

export default function FlatConnectionPanel({ initialConnectionId }: FlatConnectionPanelProps) {
  const {
    initializeClient,
    connectionState,
    error
  } = useWebRTCClientStore()

  // 连接到主机
  const handleConnect = (id: string) => {
    if (!id) return;
    // 重定向到对应 id 的分享页面
    if (!location.href.includes(id)) {
      location.href = `/access/${id}`;
      return;
    }
    initializeClient(id);
  };

  // 如果提供了初始连接ID，则自动连接
  useEffect(() => {
    if (initialConnectionId) {
      handleConnect(initialConnectionId);
    }
  }, [initialConnectionId]);
  

  const buttonProps = getButtonProps(connectionState);
  const isConnected = connectionState === ConnectionState.CONNECTED;

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
        <PopoverContent className="w-80 p-3 mt-1">
          {isConnected ? (
            <ConnectedPopoverContent />
          ) : (
            <DisconnectedPopoverContent initialConnectionId={initialConnectionId} handleConnect={handleConnect} />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
} 