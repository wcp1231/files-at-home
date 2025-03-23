'use client';

import React from 'react';
import { DynamicIcon } from 'lucide-react/dynamic';
import { useTranslations } from 'next-intl';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWebRTCHostStore } from '@/store/webrtcHostStore';
import { ConnectionPhase } from '@/lib/webrtc/host';
import { ConnectionState } from '@/lib/webrtc';
import { ClientBrowserType, ClientSystemType } from '@/lib/webrtc/host/enhanced-connection';

const ConnectionsDialog = () => {
  const t = useTranslations('ShareView.connectionsDialog');
  const { 
    connections,
    _connectionManager, 
    connectionState,
    disconnect,
  } = useWebRTCHostStore();

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

  // Determine if the dialog trigger should be disabled
  const isDialogDisabled = connectionState !== ConnectionState.CONNECTED && 
                          connectionState !== ConnectionState.WAITING_FOR_CONNECTION;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="h-8 gap-1"
          disabled={isDialogDisabled}
        >
          <DynamicIcon name="users" className="h-4 w-4" />
          <span>{t('buttonLabel')}</span>
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
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {connections.length > 0 ? (
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
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <DynamicIcon name="users" className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t('noConnections')}</p>
            </div>
          )}
        </div>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={disconnect}
            className="mt-2 sm:mt-0 bg-destructive hover:bg-destructive/80"
          >
            {t('disconnectAllButton')}
          </Button>
          <Button type="button">
            {t('closeButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionsDialog;
