import { ReactNode } from 'react';
import { FaFolder, FaFile, FaFileImage, FaFilePdf, FaFileAlt, FaFileCode } from 'react-icons/fa';
import { FileItem } from '../store/fileSystemStore';

// 格式化文件大小
export const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined) return 'Unknown';
  
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// 获取文件图标
export const getFileIcon = (file: FileItem): ReactNode => {
  if (file.isDirectory) return <FaFolder className="text-yellow-400" />;
  
  if (file.type) {
    if (file.type.startsWith('image/')) return <FaFileImage className="text-blue-400" />;
    if (file.type === 'application/pdf') return <FaFilePdf className="text-red-400" />;
    if (file.type.startsWith('text/')) return <FaFileAlt className="text-gray-400" />;
    if (file.type.includes('javascript') || file.type.includes('typescript') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
      return <FaFileCode className="text-green-400" />;
    }
  }
  
  return <FaFile className="text-gray-400" />;
}; 