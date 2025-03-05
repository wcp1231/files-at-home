import React from 'react';
import FileBrowser, { FileViewEntry } from '@/components/FileBrowser';

interface FileBrowserWrapperProps {
  handleFileSelect: (path: string) => Promise<FileViewEntry | null>;
  handleDirectorySelect: (path: string) => Promise<FileViewEntry[]>;
}

export default function FileBrowserWrapper({
  handleFileSelect,
  handleDirectorySelect
}: FileBrowserWrapperProps) {
  return (
    <div className="mb-6">
      <FileBrowser
        initialPath="/"
        onFileSelect={handleFileSelect}
        onDirectorySelect={handleDirectorySelect}
      />
    </div>
  );
} 