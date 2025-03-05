import React from 'react';
import { FileViewEntry } from '../FileBrowser';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { formatFileSize } from '@/lib/filesystem/util';

interface FileListProps<T extends FileViewEntry> {
  files: T[];
  selectedFile?: T | null;
  isLoading: boolean;
  getFileIcon: (file: T) => React.ReactNode;
  onItemClick: (file: T) => Promise<void>;
}

export function FileList<T extends FileViewEntry>({ 
  files, 
  selectedFile, 
  isLoading, 
  getFileIcon, 
  onItemClick 
}: FileListProps<T>) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Name</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Modified</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                This folder is empty
              </TableCell>
            </TableRow>
          ) : (
            files.map((file) => (
              <TableRow 
                key={file.path}
                onClick={() => onItemClick(file)}
                className={`cursor-pointer hover:bg-muted/50 ${selectedFile?.path === file.path ? 'bg-primary/10' : ''}`}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-5 w-5 mr-3">
                      {getFileIcon(file)}
                    </div>
                    <span className="truncate">{file.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {file.isDirectory ? '—' : formatFileSize(file.size)}
                </TableCell>
                <TableCell>
                  {file.modifiedAt ? 
                    (typeof file.modifiedAt === 'string' ? 
                      new Date(file.modifiedAt).toLocaleDateString() : 
                      file.modifiedAt.toLocaleDateString()
                    ) : '—'
                  }
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
} 