import { FileViewEntry } from "@/components/filebrowser/FileBrowser";

// 检查文件是否是视频文件
export const isVideoFile = (file: FileViewEntry) => {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v'];
  return videoExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext) || 
    (file.type && file.type.startsWith('video/'))
  );
};