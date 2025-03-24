'use client';

import React, { useEffect, useState } from 'react';
import { DynamicIcon } from 'lucide-react/dynamic';
import { useTranslations } from 'next-intl';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch"
import { useWebRTCHostStore } from '@/store/webrtcHostStore';
import { ConnectionPhase } from '@/lib/webrtc/host';
import { ConnectionState } from '@/lib/webrtc';
import { ClientBrowserType, ClientSystemType } from '@/lib/webrtc/host/enhanced-connection';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Get button state and label for connection
const getConnectionButtonProps = (connectionState: ConnectionState) => {
  switch (connectionState) {
    case ConnectionState.INITIALIZING:
      return {
        icon: <DynamicIcon name="loader-2" className="h-3.5 w-3.5 animate-spin" />,
        label: 'button.initializing',
        disabled: true
      };
    default:
      return {
        icon: <DynamicIcon name="link-2" className="h-3.5 w-3.5" />,
        label: 'button.share',
        disabled: false
      };
  }
};

// Get button state and label for status
const getStatusButtonProps = (connectionState: ConnectionState) => {
  switch (connectionState) {
    case ConnectionState.INITIALIZING:
      return {
        icon: <DynamicIcon name="loader-2" className="h-3.5 w-3.5 animate-spin" />,
        label: 'initializing.statusButton',
        variant: 'outline',
        disabled: true
      };
    case ConnectionState.CONNECTING:
      return {
        icon: <DynamicIcon name="loader-2" className="h-3.5 w-3.5 animate-spin" />,
        label: 'connecting.statusButton',
        variant: 'outline',
        disabled: true
      };
    case ConnectionState.WAITING_FOR_CONNECTION:
      return {
        icon: <DynamicIcon name="link-2" className="h-3.5 w-3.5" />,
        label: 'connected.statusButton.waiting',
        variant: 'secondary',
        disabled: false
      };
    case ConnectionState.CONNECTED:
      return {
        icon: <DynamicIcon name="link-2" className="h-3.5 w-3.5" />,
        label: 'connected.statusButton.connected',
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

// DisconnectedState component
interface DisconnectedStateProps {
  passphrase: string;
  setPassphrase: (passphrase: string) => void;
}

const DisconnectedState = ({ passphrase, setPassphrase }: DisconnectedStateProps) => {
  const t = useTranslations('ShareView.connectionsDialog');
  const { allowFileUploads, setAllowFileUploads } = useWebRTCHostStore();

  return (
    <div className="space-y-4 py-4">
      {/* Connection management section */}
      <div className="space-y-2 border rounded-md p-3 bg-muted/20">
        <h3 className="text-sm font-medium">{t('disconnected.passphrase.description')}</h3>
        <Input
            type="text"
            placeholder={t('disconnected.passphrase.placeholder')}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="h-7 text-sm"
          />
      </div>
      
      {/* File upload permission toggle */}
      <div className="space-y-2 border rounded-md p-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{t('disconnected.upload.title')}</h3>
          <Switch
            checked={allowFileUploads}
            onCheckedChange={setAllowFileUploads}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t('disconnected.upload.description')}
        </p>
      </div>
    </div>
  );
};

// Connected State component - Connection Info
const ConnectionInfo = () => {
  const t = useTranslations('ShareView.connectionsDialog');
  const { peerId, encryptionPassphrase } = useWebRTCHostStore();
  
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);

  // Update share URL when connection ID changes
  useEffect(() => {
    if (peerId) {
      const url = `${window.location.origin}/access/${peerId}`;
      setShareLink(url);
    } else {
      setShareLink('');
    }
  }, [peerId]);

  // Copy link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{t('connected.shareLink')}</p>
        {peerId && (
          <div className="flex items-center space-x-1">
            <Input 
              value={shareLink} 
              readOnly 
              className="h-7 text-sm" 
            />
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0" 
              onClick={handleCopyLink}
            >
              {copied ? (
                <DynamicIcon name="check" className="h-4 w-4" />
              ) : (
                <DynamicIcon name="copy" className="h-4 w-4" />
              )}
            </Button>
            
            <Popover open={showQRCode} onOpenChange={setShowQRCode}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                >
                  <DynamicIcon name="qr-code" className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-fit p-4">
                <div className="flex flex-col items-center space-y-2">
                  <QRCodeSVG value={shareLink} size={300} />
                  <p className="text-xs text-center text-muted-foreground">{t('connected.scanQRCode')}</p>
                </div>
              </PopoverContent>
            </Popover>
            
          </div>
        )}
        {encryptionPassphrase && (
          <>
            <p className="text-sm font-medium">{t('connected.connectionPassphrase')}</p>
            <div className="flex items-center space-x-1">
              <Input 
                value={encryptionPassphrase || ''} 
                readOnly 
                className="h-7 text-sm" 
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Client List component
const ClientList = () => {
  const t = useTranslations('ShareView.connectionsDialog');
  const { connections, _connectionManager } = useWebRTCHostStore();

  // Handle disconnect client
  const handleDisconnectClient = (clientId: string) => {
    if (_connectionManager) {
      _connectionManager.disconnectClient(clientId);
    }
  };

  // Get badge variant based on connection phase
  const getConnectionBadgeVariant = (phase: ConnectionPhase) => {
    switch (phase) {
      case ConnectionPhase.ACTIVE:
        return 'success';
      case ConnectionPhase.HANDSHAKING:
        return 'warning';
      default:
        return 'secondary';
    }
  };

  // Get phase text based on connection phase
  const getPhaseText = (phase: ConnectionPhase) => {
    switch (phase) {
      case ConnectionPhase.ACTIVE:
        return t('connectionPhase.active');
      case ConnectionPhase.HANDSHAKING:
        return t('connectionPhase.handshaking');
      default:
        return t('connectionPhase.disconnected');
    }
  };

  // Format connection time
  const formatConnectionTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <DynamicIcon name="users" className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{t('noConnections')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {connections.map((info) => (
        <div key={info.clientId} className="border rounded-md overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <DynamicIcon name="user" className="h-4 w-4" />
              <span className="font-mono text-sm truncate max-w-[150px]">{info.clientId}</span>
              <Badge variant={getConnectionBadgeVariant(info.phase)}>
                {getPhaseText(info.phase)}
              </Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleDisconnectClient(info.clientId)}
              className="h-7 px-2"
            >
              <DynamicIcon name="x" className="h-4 w-4" />
              <span className="sr-only">{t('disconnectClient')}</span>
            </Button>
          </div>
          <div className="p-3 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              {/* Browser info */}
              <div className="flex items-center gap-1.5">
                <DynamicIcon name="globe" className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{info.browserType !== ClientBrowserType.UNKNOWN ? 
                  `${info.browserType} ${info.browserVersion}` : 
                  t('unknownBrowser')}
                </span>
              </div>
              
              {/* System info */}
              <div className="flex items-center gap-1.5">
                <DynamicIcon name={info.systemType === ClientSystemType.ANDROID || info.systemType === ClientSystemType.IOS ? 
                  "smartphone" : "monitor"} className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{info.systemType !== ClientSystemType.UNKNOWN ? 
                  info.systemType : 
                  t('unknownSystem')}
                </span>
              </div>
            </div>
            
            {/* Connection time */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <DynamicIcon name="clock" className="h-3 w-3" />
              <span>{t('connectedAt')}: {formatConnectionTime(info.connectionTime)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Connected State component
const ConnectedState = () => {
  const t = useTranslations('ShareView.connectionsDialog');

  return (
    <div className="space-y-4 py-4">
      {/* Connection management section */}
      <div className="border rounded-md p-3 bg-muted/20">
        <ConnectionInfo />
      </div>
      
      {/* Connected clients section */}
      <div>
        <h3 className="text-sm font-medium mb-2">{t('connectedClients')}</h3>
        <ClientList />
      </div>
    </div>
  );
};

// Main ConnectionsDialog component
const ConnectionsDialog = () => {
  const t = useTranslations('ShareView.connectionsDialog');
  const { 
    connectionState,
    disconnect,
    connections,
    initializeHost,
    encryptionPassphrase,
  } = useWebRTCHostStore();

  const isConnected = connectionState === ConnectionState.CONNECTED || 
                      connectionState === ConnectionState.WAITING_FOR_CONNECTION;

  const [passphrase, setPassphrase] = useState(encryptionPassphrase || '');
  
  // Handle connection start
  const handleStartConnection = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await initializeHost(passphrase);
  };

  // Get button props for the connection status
  const buttonProps = getStatusButtonProps(connectionState);
  const connectionButtonProps = getConnectionButtonProps(connectionState);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant={buttonProps.variant as 'default' | 'outline' | 'secondary'}
          size="sm"
          className="h-7 gap-1 text-xs"
          disabled={buttonProps.disabled}
        >
          {buttonProps.icon}
          <span>{t(buttonProps.label)}</span>
          {connections.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {connections.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        
        {isConnected ? <ConnectedState /> : <DisconnectedState passphrase={passphrase} setPassphrase={setPassphrase} />}
        
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
          {isConnected ? (
            <Button
              type="button"
              variant="outline"
              onClick={disconnect}
              className="mt-2 sm:mt-0 bg-destructive text-destructive-foreground hover:bg-destructive/80"
            >
              {t('stopSharingButton')}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleStartConnection}
              disabled={connectionButtonProps.disabled}
              className="mt-2 sm:mt-0"
            >
              {connectionButtonProps.icon}
              <span className="ml-1">{t(`disconnected.${connectionButtonProps.label}`)}</span>
            </Button>
          )}
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              {t('closeButton')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionsDialog;
