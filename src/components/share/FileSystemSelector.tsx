
import { useCallback } from 'react';
import DirectorySelector from '@/components/share/DirectorySelector';
import { toast } from '@/hooks/use-toast';
import { MultiFilesSelector } from './MultiFilesSelector';


export default function FileSystemSelector({ openDirectory, onFilesSelected, isFileSystemAccessSupported }: { openDirectory: () => Promise<void>, onFilesSelected: (files: File[]) => void, isFileSystemAccessSupported: () => boolean }) {
  // 选择目录 - 使用 useCallback 优化
  const handleSelectDirectory = useCallback(async () => {
    try {
      // 打开目录
      await openDirectory();
    } catch (err) {
      toast({
        title: '无法选择目录',
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }, [openDirectory]);

  const handleFilesSelected = useCallback((files: File[]) => {
    onFilesSelected(files);
  }, [onFilesSelected]);

  // 如果没有选择目录，显示目录选择器
  return (
    <div className="flex flex-col max-w-2xl mx-auto gap-4">
      <DirectorySelector onSelectDirectory={handleSelectDirectory} isFileSystemAccessSupported={isFileSystemAccessSupported} />
      <MultiFilesSelector onFilesSelected={handleFilesSelected} />
    </div>
  );
}