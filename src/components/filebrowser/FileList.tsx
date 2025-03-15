import React, { HTMLAttributes, useCallback } from 'react';
import { FileViewEntry } from './FileBrowser';
import { 
  Table, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { TableVirtuoso } from 'react-virtuoso'
import { useFileBrowserStore } from '@/store/fileBrowserStore';
import { FileListItem } from './FileListItem';

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
        className={`py-2 text-xs md:text-sm cursor-pointer hover:bg-muted/50 ${selectedFilePath === row.path ? 'bg-muted' : ''}`}
        {...props}
      >
      </TableRow>
    );
  };

export function FileList() {
  const {
    showOperations,
    currentFiles,
    loading,
    selectedFile,
    handleItemClick,
  } = useFileBrowserStore();

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
          <TableRow className='text-xs md:text-sm'>
            <TableHead className="px-4">Name</TableHead>
            <TableHead className="px-4 w-32 hidden md:table-cell">Type</TableHead>
            <TableHead className="px-4 w-28 text-right">Size</TableHead>
            <TableHead className="px-4 w-48 hidden md:table-cell">Modified</TableHead>
            {showOperations && <TableHead className="px-4 w-32">Operation</TableHead>}
          </TableRow>
        )}
        itemContent={(index) => (
          <FileListItem
            key={currentFiles[index].path}
            file={currentFiles[index]}
          />
        )}
      />
    </>
  );
} 