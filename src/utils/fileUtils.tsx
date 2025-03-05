import { ReactNode } from 'react';
import { FaFolder, FaFile, FaFileImage, FaFilePdf, FaFileAlt, FaFileCode } from 'react-icons/fa';
import { FSDirectory, FSEntry, FSFile } from '@/lib/filesystem';

// 获取文件图标
export const getFileIcon = (entry: FSEntry): ReactNode => {
  if (entry instanceof FSDirectory) return <FaFolder className="text-yellow-400" />;
  
  if (entry instanceof FSFile) {
    const file = entry as FSFile;
    if (file.type?.startsWith('image/')) return <FaFileImage className="text-blue-400" />;
    if (file.type === 'application/pdf') return <FaFilePdf className="text-red-400" />;
    if (file.type?.startsWith('text/')) return <FaFileAlt className="text-gray-400" />;
    if (file.type?.includes('javascript') || file.type?.includes('typescript') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
      return <FaFileCode className="text-green-400" />;
    }
  }
  
  return <FaFile className="text-gray-400" />;
}; 