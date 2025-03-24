"use client"

import * as React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { useTranslations } from "next-intl"
import { DynamicIcon } from 'lucide-react/dynamic'
import { toast } from "@/hooks/use-toast"
import { useWebRTCClientStore } from "@/store/webrtcClientStore"
import { FileTransferStatus } from "@/lib/webrtc"
import { useFileBrowserStore } from "@/components/filebrowser"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

// Define interfaces for upload item status
interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: FileTransferStatus;
  error?: string;
  speed: number; // in bytes per second
}

export function FileUploadDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('FileUploadDialog');
  const connectionManager = useWebRTCClientStore(state => state._connectionManager);
  const enhancedConnection = connectionManager?.getConnection() || null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Access the features through the store's state
  const uploadAllowed = useFileBrowserStore(state => state.uploadable || false);
  
  // State for drag and drop
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // State for selected files and uploads
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  
  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      if (!isUploading) {
        setSelectedFiles([]);
        setUploadItems([]);
      }
    }
  }, [open, isUploading]);
  
  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    setSelectedFiles(prev => {
      const newFiles = Array.from(files);
      // Filter out files with the same name
      const uniqueFiles = newFiles.filter(file => 
        !prev.some(existing => existing.name === file.name)
      );
      return [...prev, ...uniqueFiles];
    });
  };
  
  // Click handler for file input
  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };
  
  // Remove a selected file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, []);
  
  // Start upload
  const startUpload = async () => {
    if (!enhancedConnection || !uploadAllowed || !selectedFiles.length) return;
    
    setIsUploading(true);
    
    const uploadManager = enhancedConnection.getUploadManager();
    
    if (!uploadManager) {
      toast({
        title: t('uploadFailed'),
        description: "Upload manager not initialized",
        variant: "destructive"
      });
      setIsUploading(false);
      return;
    }
    
    // Initialize upload items
    const initialItems: UploadItem[] = selectedFiles.map(file => ({
      id: '',
      file,
      progress: 0,
      status: FileTransferStatus.INITIALIZING,
      speed: 0
    }));
    
    setUploadItems(initialItems);
    
    // Start uploads one by one
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      try {
        // Create upload callbacks
        const callbacks = {
          onUploadStart: (uploadId: string, fileName: string, _fileSize: number) => {
            setUploadItems(prev => prev.map((item, idx) => 
              idx === i ? { ...item, id: uploadId, status: FileTransferStatus.TRANSFERRING } : item
            ));
            
            toast({
              title: t('uploadStarted'),
              description: fileName
            });
          },
          onUploadProgress: (uploadId: string, progress: number, speed: number) => {
            setUploadItems(prev => prev.map(item => 
              item.id === uploadId ? { ...item, progress, speed } : item
            ));
          },
          onUploadComplete: (uploadId: string, fileName: string) => {
            setUploadItems(prev => prev.map(item => 
              item.id === uploadId ? 
                { ...item, progress: 100, status: FileTransferStatus.COMPLETED } : 
                item
            ));
            
            toast({
              title: t('uploadComplete'),
              description: fileName
            });
          },
          onUploadError: (uploadId: string, error: string) => {
            setUploadItems(prev => prev.map(item => 
              item.id === uploadId ? 
                { ...item, error, status: FileTransferStatus.ERROR } : 
                item
            ));
            
            toast({
              title: t('uploadFailed'),
              description: error,
              variant: "destructive"
            });
          },
          onUploadCancel: (uploadId: string) => {
            setUploadItems(prev => prev.map(item => 
              item.id === uploadId ? 
                { ...item, status: FileTransferStatus.CANCELLED } : 
                item
            ));
          }
        };
        
        // Start the upload
        console.log('Starting upload for file:', file.name);
        await uploadManager.uploadFile(file, { callbacks });
      } catch (error) {
        setUploadItems(prev => prev.map((item, idx) => 
          idx === i ? 
            { ...item, error: String(error), status: FileTransferStatus.ERROR } : 
            item
        ));
        
        toast({
          title: t('uploadFailed'),
          description: String(error),
          variant: "destructive"
        });
      }
    }
    
    // Check if all uploads are complete
    const checkUploadsComplete = () => {
      const allComplete = uploadItems.every(item => 
        item.status === FileTransferStatus.COMPLETED || 
        item.status === FileTransferStatus.ERROR ||
        item.status === FileTransferStatus.CANCELLED
      );
      
      if (allComplete) {
        setIsUploading(false);
      } else {
        setTimeout(checkUploadsComplete, 1000);
      }
    };
    
    setTimeout(checkUploadsComplete, 1000);
  };
  
  // Cancel uploads
  const cancelUploads = () => {
    if (!enhancedConnection) return;
    
    const uploadManager = enhancedConnection.getUploadManager();
    
    uploadItems.forEach(item => {
      if (item.id && item.status === FileTransferStatus.TRANSFERRING) {
        uploadManager?.cancelUpload(item.id);
      }
    });
    
    setIsUploading(false);
    onOpenChange(false);
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };
  
  // Format transfer speed
  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };
  
  // Render status icon based on upload status
  const renderStatusIcon = (status: FileTransferStatus) => {
    switch (status) {
      case FileTransferStatus.COMPLETED:
        return <DynamicIcon name="check-circle" className="h-5 w-5 text-green-500" />;
      case FileTransferStatus.ERROR:
        return <DynamicIcon name="x-circle" className="h-5 w-5 text-red-500" />;
      case FileTransferStatus.CANCELLED:
        return <DynamicIcon name="slash" className="h-5 w-5 text-yellow-500" />;
      case FileTransferStatus.TRANSFERRING:
        return <DynamicIcon name="loader-2" className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <DynamicIcon name="circle" className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => onOpenChange(true)}
        >
          <DynamicIcon name="upload" className="h-3.5 w-3.5 mr-1" />
          <span>{t('title')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        
        {!uploadAllowed ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <DynamicIcon name="ban" className="h-12 w-12 text-red-500 mb-2" />
            <p className="text-sm font-medium">{t('uploadNotAllowed')}</p>
          </div>
        ) : (
          <>
            {/* File selection area */}
            {!isUploading && (
              <div 
                className={`border-2 border-dashed rounded-md p-6 mb-4 text-center ${
                  isDragging ? 'border-primary bg-primary/10' : 'border-border'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                
                <DynamicIcon 
                  name="upload-cloud" 
                  className="h-10 w-10 mx-auto mb-2 text-muted-foreground"
                />
                
                <p className="text-sm font-medium mb-2">
                  {isDragging ? t('dropFilesHere') : t('dragFilesHere')}
                </p>
                
                <Button variant="outline" size="sm" onClick={handleSelectClick}>
                  {t('selectFiles')}
                </Button>
              </div>
            )}
            
            {/* Selected files list or upload progress */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {isUploading ? (
                uploadItems.map((item, index) => (
                  <div key={`upload-${index}`} className="flex flex-col gap-2 p-3 border rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {renderStatusIcon(item.status)}
                        <span className="text-sm font-medium truncate">{item.file.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatFileSize(item.file.size)}
                      </span>
                    </div>
                    
                    <Progress value={item.progress} className="h-2" />
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{`${item.progress.toFixed(0)}%`}</span>
                      {item.status === FileTransferStatus.TRANSFERRING && (
                        <span>{formatSpeed(item.speed)}</span>
                      )}
                    </div>
                    
                    {item.error && (
                      <p className="text-xs text-red-500 mt-1">{item.error}</p>
                    )}
                  </div>
                ))
              ) : (
                selectedFiles.length > 0 ? (
                  selectedFiles.map((file, index) => (
                    <div 
                      key={`file-${index}`} 
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <DynamicIcon name="file" className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{file.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={() => removeFile(index)}
                        >
                          <DynamicIcon name="x" className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    {t('noFilesSelected')}
                  </p>
                )
              )}
            </div>
          </>
        )}
        
        <DialogFooter>
          {isUploading ? (
            <Button variant="destructive" onClick={cancelUploads}>
              {t('cancelButton')}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancelButton')}
              </Button>
              <Button 
                onClick={startUpload} 
                disabled={!uploadAllowed || selectedFiles.length === 0}
              >
                {t('uploadButton')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
