import React, { HTMLAttributes, useCallback, useMemo } from 'react';
import { FileViewEntry } from './FileBrowser';
import { 
  Table, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { TableVirtuoso } from 'react-virtuoso'
import { formatFileSize } from '@/lib/filesystem/util';
import { useFileBrowserStore } from '@/store/fileBrowserStore';
import { getFileIcon } from './FileIcons';

const TableRowComponent = (selectedFilePath: string | null, rows: FileViewEntry[], handleFileClick: (file: FileViewEntry) => Promise<void>) =>
  function getTableRow(props: HTMLAttributes<HTMLTableRowElement>) {
    // @ts-expect-error data-index is a valid attribute
    const index = props["data-index"];
    const row = rows[index];

    const handleClick = (file: FileViewEntry) => {
      handleFileClick(file);
    }

    if (!row) return null;

    return (
      <TableRow
        key={row.path}
        onClick={() => handleClick(row)}
        className={`py-2 cursor-pointer hover:bg-muted/50 ${selectedFilePath === row.path ? 'bg-muted' : ''}`}
        {...props}
      >
      </TableRow>
    );
  };

function RowComponent({ file, getFileIcon }: { file: FileViewEntry; getFileIcon: (file: FileViewEntry) => React.ReactNode; }) {
  return (
    <>
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
    </>
  );
}

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

  const handleFileClick = useCallback(async (file: FileViewEntry) => {
    await handleItemClick(file);
  }, [handleItemClick]);

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!currentFiles || currentFiles.length === 0) {
    return <div className="p-4 text-center">No files found</div>;
  }

  return (
    <>
      <TableVirtuoso
        className='h-full w-full'
        data={currentFiles}
        components={{
          Table: (props) => <Table {...props} />,
          TableHead: (props) => <TableHeader {...props} />,
          TableRow: TableRowComponent(selectedFilePath, currentFiles, handleFileClick),
        }}
        fixedHeaderContent={() => (
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead className="text-right">Modified</TableHead>
          </TableRow>
        )}
        itemContent={(index) => (
          <RowComponent
            key={currentFiles[index].path}
            file={currentFiles[index]}
            getFileIcon={getCustomFileIcon}
          />
        )}
      />
    </>
  );
} 