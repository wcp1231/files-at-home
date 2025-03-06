import React, { useCallback, useMemo } from 'react';
import { FileViewEntry } from './FileBrowser';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { formatFileSize } from '@/lib/filesystem/util';
import { useFileBrowserStore } from '@/store/fileBrowserStore';
import { getFileIcon } from './FileIcons';

// 单个文件行组件，使用 memo 避免不必要的重新渲染
function FileRowComponent({ 
  file, 
  isSelected, 
  getFileIcon, 
  onClick 
}: { 
  file: FileViewEntry; 
  isSelected: boolean; 
  getFileIcon: (file: FileViewEntry) => React.ReactNode; 
  onClick: (file: FileViewEntry) => Promise<void>; 
}) {
  const handleClick = useCallback(() => {
    onClick(file);
  }, [onClick, file]);

  return (
    <TableRow 
      className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-muted' : ''}`}
      onClick={handleClick}
    >
      <TableCell className="py-2">
        <div className="flex items-center">
          <div className="mr-2">
            {getFileIcon(file)}
          </div>
          <span>{file.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        {file.size !== undefined && !file.isDirectory ? formatFileSize(file.size) : ''}
      </TableCell>
      <TableCell className="text-right">
        {file.modifiedAt ? new Date(file.modifiedAt).toLocaleString() : ''}
      </TableCell>
    </TableRow>
  );
}

// 使用 React.memo 优化渲染性能
const MemoizedFileRow = React.memo(FileRowComponent) as typeof FileRowComponent;

export function FileList() {
  const { 
    currentFiles, 
    loading, 
    selectedFile,
    handleItemClick,
    renderFileIcon
  } = useFileBrowserStore();

  // 获取文件图标
  const getCustomFileIcon = useMemo(() => {
    return (file: FileViewEntry) => {
      // 如果提供了自定义图标渲染器，使用它
      if (renderFileIcon) {
        return renderFileIcon(file);
      }
      
      // 使用默认图标
      return getFileIcon(file);
    };
  }, [renderFileIcon]);

  // 只传递选中文件的路径，而不是整个文件对象，减少不必要的渲染
  const selectedFilePath = selectedFile ? selectedFile.path : null;

  const handleFileClick = useCallback(async (file: T) => {
    await handleItemClick(file);
  }, [handleItemClick]);

  if (loading && (!currentFiles || currentFiles.length === 0)) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!currentFiles || currentFiles.length === 0) {
    return <div className="p-4 text-center">No files found</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">Size</TableHead>
          <TableHead className="text-right">Modified</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {currentFiles.map((file: FileViewEntry) => (
          <MemoizedFileRow
            key={file.path}
            file={file}
            isSelected={selectedFilePath === file.path}
            getFileIcon={getCustomFileIcon}
            onClick={handleFileClick}
          />
        ))}
      </TableBody>
    </Table>
  );
} 