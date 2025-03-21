import { FileViewEntry } from "@/components/filebrowser/FileBrowser";

// 检查文件是否是视频文件
export const isVideoFile = (file: FileViewEntry) => {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v'];
  return videoExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext) || 
    (file.type && file.type.startsWith('video/'))
  );
};

// 检查文件是否是PDF文件
export const isPdfFile = (file: FileViewEntry) => {
  return file.name.toLowerCase().endsWith('.pdf') || 
         (file.type && file.type === 'application/pdf');
};

export function isImageFile(file: FileViewEntry): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  return imageExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext) || 
    (file.type && file.type.startsWith('image/'))
  );
}

export function isAudioFile(file: FileViewEntry): boolean {
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
  return audioExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext) || 
    (file.type && file.type.startsWith('audio/'))
  );
}

// 格式化修改时间
// 忽略秒
export const formatModifiedTime = (modifiedAt: string | Date | undefined) => {
  if (!modifiedAt) return '';
  const date = new Date(modifiedAt);
  return date.toLocaleString('local', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
};