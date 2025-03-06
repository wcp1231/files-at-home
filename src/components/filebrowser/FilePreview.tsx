import React from 'react';
import { FileViewEntry } from './FileBrowser';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { formatFileSize } from '@/lib/filesystem/util';
import { useFileBrowserStore } from '@/store/fileBrowserStore';
import { getFileIcon } from './FileIcons';

export function FilePreview<T extends FileViewEntry>() {
  const { 
    selectedFile, 
    handleFileDownload,
    renderFileIcon
  } = useFileBrowserStore();

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
    if (selectedFile) {
      await handleFileDownload(selectedFile as T);
    }
  };

  return (
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 这里可以添加文件预览内容，如图片预览、文本预览等 */}
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
  );
} 