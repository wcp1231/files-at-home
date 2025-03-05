import React, { useState, useEffect } from 'react';
import { Link2, Copy, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConnectionState } from '@/lib/webrtc';

interface ConnectionInfoProps {
  error: string | null;
  connectionState: ConnectionState;
  connectionId: string | null;
  disconnect: () => void;
  initializeHost: () => Promise<string>;
}

function ErrorPanel({ error, initializeHost }: { error: string, initializeHost: () => Promise<string> }) {
  return (
    <>
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center py-6">
          <Button onClick={() => initializeHost().catch(console.error)}>
            重新初始化连接
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function InitializingPanel() {
  return (
    <Card className="mb-6">
      <CardContent className="flex items-center justify-center py-6">
        <Loader2 className="h-6 w-6 text-primary animate-spin mr-3" />
        <p className="text-muted-foreground">正在初始化...</p>
      </CardContent>
    </Card>
  );
}

// 共享 URL 和连接 ID 的显示组件，用于 WaitingForConnectionPanel 和 ConnectedPanel
function ConnectionInfoDisplay({ connectionId, title, subtitle }: { 
  connectionId: string | null, 
  title: string,
  subtitle?: string
}) {
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

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center">
          <div className="bg-primary/10 p-2 rounded-full mr-3">
            <Link2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Peer ID: <span className="font-mono bg-muted px-2 py-0.5 rounded">{connectionId}</span>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="flex h-10 items-center rounded-md border bg-background pl-3 focus-within:ring-1 focus-within:ring-ring">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1 border-0 bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                className="p-0 w-8"
                onClick={handleCopyLink}
                title="复制链接"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WaitingForConnectionPanel({ connectionId }: { connectionId: string | null }) {
  return connectionId ? (
    <ConnectionInfoDisplay 
      connectionId={connectionId} 
      title="已准备好分享"
      subtitle="等待远程连接..."
    />
  ) : (
    <Card className="mb-6">
      <CardContent className="flex items-center justify-center py-6">
        <p className="text-muted-foreground">等待连接...</p>
      </CardContent>
    </Card>
  );
}

function ConnectingPanel() {
  return (
    <Card className="mb-6">
      <CardContent className="flex items-center justify-center py-6">
        <Loader2 className="h-6 w-6 text-primary animate-spin mr-3" />
        <p className="text-muted-foreground">正在初始化连接...</p>  
      </CardContent>
    </Card>
  );
}

function DisconnectedPanel({ initializeHost }: { initializeHost: () => Promise<string> }) {
  return (
    <Card className="mb-6">
      <CardContent className="flex items-center justify-center py-6 flex-col gap-4">
        <p className="text-muted-foreground">未连接，点击下面的按钮开始分享</p>
        <Button onClick={() => initializeHost().catch(console.error)}>
          初始化连接
        </Button>
      </CardContent>
    </Card>
  );
}

function ConnectedPanel({ connectionId, disconnect }: { connectionId: string | null, disconnect: () => void }) {
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

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center">
          <div className="bg-primary/10 p-2 rounded-full mr-3">
            <Link2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">目录已准备好分享</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Peer ID: <span className="font-mono bg-muted px-2 py-0.5 rounded">{connectionId}</span>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="flex h-10 items-center rounded-md border bg-background pl-3 focus-within:ring-1 focus-within:ring-ring">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1 border-0 bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                className="h-8 w-8"
                onClick={handleCopyLink}
                title="复制链接"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button
            onClick={disconnect}
          >
            断开连接
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConnectionInfo({ 
  error,
  connectionState,
  connectionId,
  disconnect,
  initializeHost,
}: ConnectionInfoProps) {
  console.log('ConnectionInfo', error, connectionState, connectionId);

  // 渲染标题
  const renderHeader = () => (
    <h1 className="text-3xl font-bold tracking-tight mb-6">分享目录</h1>
  );

  return (
    <>
      {renderHeader()}
      
      {error && <ErrorPanel error={error} initializeHost={initializeHost} />}

      {!error && connectionState === ConnectionState.INITIALIZING && <InitializingPanel />}
      {!error && connectionState === ConnectionState.WAITING_FOR_CONNECTION && <WaitingForConnectionPanel connectionId={connectionId} />}
      {!error && connectionState === ConnectionState.CONNECTING && <ConnectingPanel />}
      {!error && connectionState === ConnectionState.CONNECTED && (
        <ConnectedPanel connectionId={connectionId} disconnect={disconnect} />
      )}
      {!error && connectionState === ConnectionState.DISCONNECTED && <DisconnectedPanel initializeHost={initializeHost} />}
    </>
  );
} 