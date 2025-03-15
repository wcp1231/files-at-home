import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { HeaderTitle } from './HeaderTitle';
import { FileList } from './FileList';
import HeaderToolbar from './HeaderToolbar';
import VideoPlayerDialog from './VideoPlayerDialog';
import ImageViewerDialog from './ImageViewerDialog';

const PdfViewerDialog = dynamic(() => import('./PdfViewerDialog'), { ssr: false });

// Generic file interface that can work with both local and remote files
export interface FileViewEntry {
  name: string;
  path: string;
  size?: number;
  type?: string;
  modifiedAt?: string | Date;
  isDirectory: boolean;
  data?: ArrayBuffer; // 添加数据字段，用于存储文件内容
}

// Props interface
interface FileBrowserProps {
  titlePanel?: ReactNode;
}

export default function FileBrowser({
  titlePanel,
}: FileBrowserProps) {
  return (
    <Card className="h-full overflow-hidden">
      <div className="bg-card border-b">
        <HeaderTitle title="File Browser">
          {titlePanel}
        </HeaderTitle>

        <HeaderToolbar />
      </div>
      
      <CardContent className="p-0 h-[calc(100%-85px)]">
        <div className="flex flex-row h-full">
          <div className="w-full overflow-y-scroll">
            <FileList />
          </div>
        </div>
        {/* 使用抽取出来的视频播放对话框组件 */}
        <VideoPlayerDialog />
        {/* 使用PDF查看对话框组件 */}
        <PdfViewerDialog />
        {/* 使用图片查看对话框组件 */}
        <ImageViewerDialog />
      </CardContent>
    </Card>
  );
} 