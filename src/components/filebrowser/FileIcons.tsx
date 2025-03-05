import React from 'react';
import { FileViewEntry } from '../FileBrowser';
import { 
  File, 
  Folder, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileCode, 
  FileArchive 
} from 'lucide-react';

export function getFileIcon(file: FileViewEntry): React.ReactNode {
  if (file.isDirectory) {
    return <Folder className="text-amber-500" />;
  }

  // 根据文件类型返回不同的图标
  if (file.type) {
    if (file.type.startsWith('image/')) {
      return <FileImage className="text-blue-500" />;
    }
    if (file.type.startsWith('video/')) {
      return <FileVideo className="text-red-500" />;
    }
    if (file.type.startsWith('audio/')) {
      return <FileAudio className="text-purple-500" />;
    }
    if (file.type.startsWith('text/')) {
      return <FileText className="text-gray-500" />;
    }
    if (file.type.includes('javascript') || file.type.includes('json') || file.type.includes('css') || file.type.includes('html')) {
      return <FileCode className="text-green-500" />;
    }
    if (file.type.includes('zip') || file.type.includes('compressed') || file.type.includes('archive')) {
      return <FileArchive className="text-yellow-600" />;
    }
  }

  // 根据文件扩展名返回不同的图标
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension) {
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
      return <FileImage className="text-blue-500" />;
    }
    if (['mp4', 'webm', 'avi', 'mov', 'flv'].includes(extension)) {
      return <FileVideo className="text-red-500" />;
    }
    if (['mp3', 'wav', 'ogg', 'flac'].includes(extension)) {
      return <FileAudio className="text-purple-500" />;
    }
    if (['txt', 'md', 'rtf', 'csv'].includes(extension)) {
      return <FileText className="text-gray-500" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml', 'py', 'rb', 'java', 'php'].includes(extension)) {
      return <FileCode className="text-green-500" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      return <FileArchive className="text-yellow-600" />;
    }
  }

  // 默认文件图标
  return <File className="text-gray-400" />;
} 