import React, { useState, useEffect } from 'react';
import { useWebRTCClientStore } from '@/store/webrtcClientStore';
import { FileTransferStatus, FileTransfer } from '@/lib/webrtc/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

interface NetworkSpeedDisplayProps {
  className?: string;
}

// 格式化字节大小的函数
const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function NetworkSpeedDisplay({ className = '' }: NetworkSpeedDisplayProps) {
  const fileTransferMap = useWebRTCClientStore(state => state.fileTransfers);
  const fileTransfers = Array.from(fileTransferMap.values());
  const [totalSpeed, setTotalSpeed] = useState<number>(0);

  
  useEffect(() => {
    // Calculate total speed from all active transfers
    const calculateTotalSpeed = () => {
      const activeTransfers = fileTransfers.filter(
        transfer => transfer.status === FileTransferStatus.TRANSFERRING
      );
      
      const total = activeTransfers.reduce((sum, transfer) => sum + transfer.speed, 0);
      setTotalSpeed(total);
    };
    
    // Calculate immediately when fileTransfers changes
    calculateTotalSpeed();
    
    // Also set up an interval to update regularly (for smoother UI updates)
    const interval = setInterval(calculateTotalSpeed, 1000);
    
    return () => clearInterval(interval);
  }, [fileTransfers]);
  
  // Format speed to human-readable format
  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024) {
      return `${bytesPerSecond.toFixed(1)} B/s`;
    } else if (bytesPerSecond < 1024 * 1024) {
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    } else {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
    }
  };

  // Get status text for a file transfer
  const getStatusText = (status: FileTransferStatus): string => {
    switch (status) {
      case FileTransferStatus.INITIALIZING:
        return '初始化';
      case FileTransferStatus.TRANSFERRING:
        return '传输中';
      case FileTransferStatus.ASSEMBLING:
        return '组装中';
      case FileTransferStatus.COMPLETED:
        return '已完成';
      case FileTransferStatus.ERROR:
        return '错误';
      case FileTransferStatus.CANCELLED:
        return '已取消';
      default:
        return '未知';
    }
  };

  // Format time elapsed for a file transfer
  const formatTimeElapsed = (transfer: FileTransfer): string => {
    const startTime = transfer.startTime;
    const endTime = transfer.endTime || Date.now();
    const elapsedMs = endTime - startTime;
    
    const seconds = Math.floor(elapsedMs / 1000) % 60;
    const minutes = Math.floor(elapsedMs / (1000 * 60)) % 60;
    const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`h-7 px-2 text-xs ${className}`}
        >
          <span className="font-medium">{formatSpeed(totalSpeed)}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>文件传输状态</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {fileTransfers.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              没有文件传输记录
            </div>
          ) : (
            <div className="space-y-4">
              {fileTransfers.map((transfer) => (
                <div key={transfer.fileId} className="border rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium truncate" title={transfer.name}>
                      {transfer.name}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      transfer.status === FileTransferStatus.COMPLETED 
                        ? 'bg-green-100 text-green-800' 
                        : transfer.status === FileTransferStatus.ERROR 
                        ? 'bg-red-100 text-red-800'
                        : transfer.status === FileTransferStatus.TRANSFERRING
                        ? 'bg-blue-100 text-blue-800'
                        : transfer.status === FileTransferStatus.CANCELLED
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {getStatusText(transfer.status)}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mb-1">
                    {transfer.path}
                  </div>
                  
                  <div className="flex justify-between text-xs mb-2">
                    <span>{formatBytes(transfer.size)}</span>
                    <span>已用时间: {formatTimeElapsed(transfer)}</span>
                  </div>
                  
                  <Progress value={transfer.progress} className="h-2 mb-2" />
                  
                  <div className="flex justify-between text-xs">
                    <span>{Math.round(transfer.progress)}%</span>
                    <span>速度: {formatSpeed(transfer.speed)}</span>
                  </div>
                  
                  {transfer.error && (
                    <div className="mt-2 text-xs text-red-500">
                      错误: {transfer.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 