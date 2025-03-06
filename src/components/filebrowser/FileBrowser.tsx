import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { HeaderTitle } from './HeaderTitle';
import { FileList } from './FileList';
import { FilePreview } from './FilePreview';
import HeaderToolbar from './HeaderToolbar';

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
interface FileBrowserProps<T extends FileViewEntry> {
  titlePanel?: ReactNode;
}

export default function FileBrowser<T extends FileViewEntry>({
  titlePanel,
}: FileBrowserProps<T>) {
  return (
    <Card className="h-full overflow-hidden">
      <div className="bg-card border-b">
        <HeaderTitle title="File Browser">
          {titlePanel}
        </HeaderTitle>

        <HeaderToolbar />
      </div>
      
      <CardContent className="p-0 h-[calc(100%-85px)]">
        <div className="flex flex-col md:flex-row h-full">
          <div className="w-full md:w-2/3 border-r overflow-y-scroll">
            <FileList />
          </div>
          
          <div className="w-full md:w-1/3 overflow-y-scroll">
            <FilePreview />
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 