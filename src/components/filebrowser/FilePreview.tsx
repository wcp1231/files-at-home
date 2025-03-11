import React, { useState } from 'react';
import { FileViewEntry } from './FileBrowser';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Play } from 'lucide-react';
import { formatFileSize } from '@/lib/filesystem/util';
import { useFileBrowserStore } from '@/store/fileBrowserStore';
import { getFileIcon } from './FileIcons';
import { isVideoFile } from '@/utils/browserUtil';

export function FilePreview<T extends FileViewEntry>() {
  const { 
    selectedFile, 
    renderFileIcon,
    onFileData,
    setVideoUrl,
    setVideoDialogOpen
  } = useFileBrowserStore();
  
  console.log('preview', selectedFile);

  // 如果没有选中文件，不显示任何内容
  if (!selectedFile) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No file selected
      </div>
    );
  }

  // 获取文件图标
  const getCustomFileIcon = (file: T) => {
    // 如果提供了自定义图标渲染器，使用它
    if (renderFileIcon) {
      return renderFileIcon(file);
    }
    
    // 使用默认图标
    return getFileIcon(file);
  };

  const handleDownload = async () => {
    let iframe = document.createElement('iframe');
    iframe.setAttribute('id', selectedFile.path);
    iframe.hidden = true
    iframe.style.display = "none";
    iframe.src = `/receive?path=${selectedFile.path}&name=${selectedFile.name}&size=${selectedFile.size}#download`;
    iframe.onload = function() {
      console.log("iframe loaded");
      document.body.removeChild(iframe);
    };
    document.body.appendChild(iframe);
  };

  // 处理视频播放
  const handlePlayVideo = async () => {
    if (isVideoFile(selectedFile) && onFileData) {
      try {
        const chunkSize = 1024 * 1024;
        // 创建URL用于视频播放
        setVideoUrl(`/receive?path=${selectedFile.path}&size=${selectedFile.size}&chunkSize=${chunkSize}&type=${selectedFile.type}#play`);
        setVideoDialogOpen(true);
      } catch (error) {
        console.error('Error playing video:', error);
      }
    }
  };

  // 检测当前文件是否可以播放视频
  const canPlayVideo = !selectedFile.isDirectory && isVideoFile(selectedFile);

  return (
    <>
      <Card className="h-full border-0 rounded-none shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-2">
                {getCustomFileIcon(selectedFile as T)}
              </div>
              <div>
                <CardTitle className="text-lg">{selectedFile.name}</CardTitle>
                <CardDescription>
                  {selectedFile.size !== undefined && !selectedFile.isDirectory 
                    ? formatFileSize(selectedFile.size) 
                    : 'Directory'}
                </CardDescription>
              </div>
            </div>
            
            {!selectedFile.isDirectory && (
              <div className="flex items-center gap-2">
                {canPlayVideo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePlayVideo}
                    title={"Play Video"}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownload}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* 基本文件信息 */}
          <div className="text-sm text-muted-foreground">
            {selectedFile.modifiedAt && (
              <div>
                Modified: {new Date(selectedFile.modifiedAt).toLocaleString()}
              </div>
            )}
            <div>
              Path: {selectedFile.path}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
} 