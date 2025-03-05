import React, { useState } from 'react';
import { Loader2, AlertCircle } from "lucide-react";
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
  connect: (id: string) => void;
}

function ErrorPanel({ error, connect }: { error: string, connect: (id: string) => void }) {
  const [connectionIdInput, setConnectionIdInput] = useState('');
  
  return (
    <>
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">重新连接</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              value={connectionIdInput}
              onChange={(e) => setConnectionIdInput(e.target.value)}
              placeholder="输入连接 ID"
              className="mb-2"
            />
          </div>
          <Button 
            onClick={() => connect(connectionIdInput)}
            disabled={!connectionIdInput}
          >
            重新连接
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function ConnectingPanel() {
  return (
    <Card className="mb-6">
      <CardContent className="flex items-center justify-center py-6">
        <Loader2 className="h-6 w-6 text-primary animate-spin mr-3" />
        <p className="text-muted-foreground">正在连接...</p>  
      </CardContent>
    </Card>
  );
}

function DisconnectedPanel({ connect }: { connect: (id: string) => void }) {
  const [connectionIdInput, setConnectionIdInput] = useState('');
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">连接到分享</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            value={connectionIdInput}
            onChange={(e) => setConnectionIdInput(e.target.value)}
            placeholder="输入连接 ID 或粘贴分享链接"
            className="mb-2"
          />
          <p className="text-xs text-muted-foreground">
            输入由分享方提供的连接 ID 或完整的分享链接
          </p>
        </div>
        <Button 
          onClick={() => connect(connectionIdInput)}
          disabled={!connectionIdInput}
          className="w-full"
        >
          连接
        </Button>
      </CardContent>
    </Card>
  );
}

function ConnectedPanel({ connectionId, disconnect }: { connectionId: string | null, disconnect: () => void }) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center">
          <div>
            <CardTitle className="text-lg">已连接到分享</CardTitle>
            {connectionId && (
              <p className="text-xs text-muted-foreground mt-1">
                Peer ID: <span className="font-mono bg-muted px-2 py-0.5 rounded">{connectionId}</span>
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          onClick={disconnect}
        >
          断开连接
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ConnectionInfo({ 
  error,
  connectionState,
  connectionId,
  disconnect,
  connect,
}: ConnectionInfoProps) {
  console.log('ConnectionInfo', error, connectionState, connectionId);

  // 渲染标题
  const renderHeader = () => (
    <h1 className="text-3xl font-bold tracking-tight mb-6">接收分享</h1>
  );

  return (
    <>
      {renderHeader()}
      
      {error && <ErrorPanel error={error} connect={connect} />}

      {!error && connectionState === ConnectionState.CONNECTING && <ConnectingPanel />}
      {!error && connectionState === ConnectionState.CONNECTED && (
        <ConnectedPanel connectionId={connectionId} disconnect={disconnect} />
      )}
      {!error && connectionState === ConnectionState.DISCONNECTED && <DisconnectedPanel connect={connect} />}
    </>
  );
} 