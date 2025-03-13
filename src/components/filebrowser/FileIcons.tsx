import React from 'react';
import { FileViewEntry } from './FileBrowser';
import { DynamicIcon } from 'lucide-react/dynamic'

export function getFileIcon(file: FileViewEntry): React.ReactNode {
  if (file.isDirectory) {
    return <DynamicIcon name="folder" className="text-amber-500" />;
  }

  // 根据文件类型返回不同的图标
  if (file.type) {
    if (file.type.startsWith('image/')) {
      return <DynamicIcon name="file-image" className="text-blue-500" />;
    }
    if (file.type.startsWith('video/')) {
      return <DynamicIcon name="file-video" className="text-red-500" />;
    }
    if (file.type.startsWith('audio/')) {
      return <DynamicIcon name="file-audio" className="text-purple-500" />;
    }
    if (file.type.startsWith('text/')) {
      return <DynamicIcon name="file-text" className="text-gray-500" />;
    }
    if (file.type.includes('javascript') || file.type.includes('json') || file.type.includes('css') || file.type.includes('html')) {
      return <DynamicIcon name="file-code" className="text-green-500" />;
    }
    if (file.type.includes('zip') || file.type.includes('compressed') || file.type.includes('archive')) {
      return <DynamicIcon name="file-archive" className="text-yellow-600" />;
    }
  }

  // 根据文件扩展名返回不同的图标
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension) {
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
      return <DynamicIcon name="file-image" className="text-blue-500" />;
    }
    if (['mp4', 'webm', 'avi', 'mov', 'flv'].includes(extension)) {
      return <DynamicIcon name="file-video" className="text-red-500" />;
    }
    if (['mp3', 'wav', 'ogg', 'flac'].includes(extension)) {
      return <DynamicIcon name="file-audio" className="text-purple-500" />;
    }
    if (['txt', 'md', 'rtf', 'csv'].includes(extension)) {
      return <DynamicIcon name="file-text" className="text-gray-500" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml', 'py', 'rb', 'java', 'php'].includes(extension)) {
      return <DynamicIcon name="file-code" className="text-green-500" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      return <DynamicIcon name="file-archive" className="text-yellow-600" />;
    }
  }

  // 默认文件图标
  return <DynamicIcon name="file" className="text-gray-400" />;
} 