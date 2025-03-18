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
import { useWebRTCClientStore } from '@/store/webrtcClientStore';
import { useTranslations } from 'next-intl';

interface FlatConnectionPanelProps {
  initialConnectionId?: string;
}

// 获取按钮状态和标签
const getConnectionButtonProps = (connectionState: ConnectionState) => {
  switch (connectionState) {
    case ConnectionState.INITIALIZING:
      return {
        icon: <DynamicIcon name="loader-2" className="h-3.5 w-3.5 animate-spin" />,
        label: 'disconnected.button.initializing',
        disabled: true
      };
    default:
      return {
        icon: <DynamicIcon name="link-2" className="h-3.5 w-3.5" />,
        label: 'disconnected.button.connect',
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
        label: 'initializing.statusButton',
        variant: 'outline',
        disabled: true
      };
    case ConnectionState.CONNECTING:
    case ConnectionState.HANDSHAKING:
      return {
        icon: <DynamicIcon name="loader-2" className="h-3.5 w-3.5 animate-spin" />,
        label: 'connecting.statusButton',
        variant: 'outline',
        disabled: true
      };
    case ConnectionState.CONNECTED:
      return {
        icon: <DynamicIcon name="link-2" className="h-3.5 w-3.5" />,
        label: 'connected.statusButton',
        variant: 'default',
        disabled: false
      };
    case ConnectionState.DISCONNECTED:
    default:
      return {
        icon: <DynamicIcon name="link-2" className="h-3.5 w-3.5" />,
        label: 'disconnected.statusButton',
        variant: 'outline',
        disabled: false
      };
  }
};

const ConnectedPopoverContent = () => {
  const t = useTranslations('AccessView.connectionPanel');
  const { connectionId, disconnect } = useWebRTCClientStore();
  return (
    <div className="space-y-3">
      <div className="flex flex-col">
        <p className="text-sm font-medium mb-1">{t('connected.description')}</p>
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
        {t('connected.button.disconnect')}
      </Button>
    </div>
  );
}
const DisconnectedPopoverContent = ({ initialConnectionId, handleConnect }: { initialConnectionId: string | undefined, handleConnect: (id: string) => void }) => {
  const t = useTranslations('AccessView.connectionPanel');
  const { connectionState } = useWebRTCClientStore();
  const [connectionIdInput, setConnectionIdInput] = useState<string>(initialConnectionId || '');
  const buttonProps = getConnectionButtonProps(connectionState);

  return (
    <div className="space-y-3">
      <p className="text-xs">{t('disconnected.description')}</p>
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
          <span className="ml-1">{t(buttonProps.label)}</span>
        </Button>
      </div>
    </div>
  );
};

export default function FlatConnectionPanel({ initialConnectionId }: FlatConnectionPanelProps) {
  const t = useTranslations('AccessView.connectionPanel');
  const {
    initializeClient,
    connectionState,
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
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={buttonProps.variant as 'default' | 'outline'}
            className="h-7 px-2 text-xs"
            disabled={buttonProps.disabled}
          >
            {buttonProps.icon}
            <span className="ml-1">{t(buttonProps.label)}</span>
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