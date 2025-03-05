import React, { useState } from 'react';
import { Link2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConnectionInfoProps {
  connectionId: string | null;
  shareUrl: string;
  onDisconnect: () => void;
}

export default function ConnectionInfo({ connectionId, shareUrl, onDisconnect }: ConnectionInfoProps) {
  const [copied, setCopied] = useState(false);

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
                variant="ghost"
                size="icon"
                onClick={handleCopyLink}
                className="h-8 w-8"
                title="复制链接"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onDisconnect}>
            断开连接
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 