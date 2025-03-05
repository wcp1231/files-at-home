import React from 'react';
import { FileViewEntry } from '../FileBrowser';
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

interface FilePreviewProps<T extends FileViewEntry> {
  file: T | null;
  getFileIcon: (file: T) => React.ReactNode;
  onDownload: (file: T) => void;
}

export function FilePreview<T extends FileViewEntry>({ 
  file, 
  getFileIcon, 
  onDownload 
}: FilePreviewProps<T>) {
  if (!file) return null;

  const modifiedDate = file.modifiedAt ? 
    (typeof file.modifiedAt === 'string' ? 
      new Date(file.modifiedAt) : 
      file.modifiedAt
    ).toLocaleDateString() : 
    '—';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 flex items-center justify-center">
            {getFileIcon(file)}
          </div>
          <div>
            <CardTitle className="text-lg">{file.name}</CardTitle>
            <CardDescription>{file.type || 'Unknown type'}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Size:</div>
          <div>{formatFileSize(file.size)}</div>
          <div className="text-muted-foreground">Modified:</div>
          <div>{modifiedDate}</div>
          <div className="text-muted-foreground">Path:</div>
          <div className="truncate">{file.path}</div>
        </div>
        {!file.isDirectory && (
          <div className="mt-4">
            <Button
              onClick={() => onDownload(file)}
              className="w-full"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 