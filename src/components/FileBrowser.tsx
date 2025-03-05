import { useEffect, useState, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileBrowserHeader } from './filebrowser/FileBrowserHeader';
import { FileList } from './filebrowser/FileList';
import { FilePreview } from './filebrowser/FilePreview';
import { getFileIcon } from './filebrowser/FileIcons';

// Generic file interface that can work with both local and remote files
export interface FileViewEntry {
  name: string;
  path: string;
  size?: number;
  type?: string;
  modifiedAt?: string | Date;
  isDirectory: boolean;
}

// Props interface
interface FileBrowserProps<T extends FileViewEntry> {
  // Initial path
  initialPath?: string;

  // Callback handlers
  onFileSelect?: (path: string) => Promise<T | null>;
  onDirectorySelect?: (path: string) => Promise<T[]>;
  
  // Custom icon renderer
  renderFileIcon?: (file: T) => ReactNode;
}

export default function FileBrowser<T extends FileViewEntry>({
  initialPath = '/',
  onFileSelect,
  onDirectorySelect,
  renderFileIcon,
}: FileBrowserProps<T>) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [currentFiles, setCurrentFiles] = useState<T[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['/']);
  const [selectedFile, setSelectedFile] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigateToDirectory(initialPath);
  }, [initialPath]);

  // 获取文件列表
  const fetchFiles = async (path: string) => {
    if (!onDirectorySelect) return;
    setLoading(true);
    try {
      const files = await onDirectorySelect(path);
      setCurrentFiles(files);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 导航到目录
  const navigateToDirectory = async (path: string) => {
    // 确保路径以 / 结尾
    const normalizedPath = path.endsWith('/') ? path : `${path}/`;
    await fetchFiles(normalizedPath);
    setCurrentPath(normalizedPath);
    
    // 更新面包屑
    const pathParts = normalizedPath.split('/').filter(Boolean);
    setBreadcrumbs(['/', ...pathParts]);
  };
  
  // 导航到面包屑
  const navigateToBreadcrumb = async (index: number) => {
    if (index === 0) {
      await navigateToDirectory('/');
    } else {
      const pathParts = breadcrumbs.slice(1, index + 1);
      await navigateToDirectory(`/${pathParts.join('/')}/`);
    }
  };
  
  // 导航到上一级目录
  const navigateUp = async () => {
    if (currentPath === '/') return;
    
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();
    const newPath = pathParts.length ? `/${pathParts.join('/')}/` : '/';
    
    await navigateToDirectory(newPath);
  };

  const handleFileSelect = async (file: T) => {
    if (!onFileSelect) return;
    setLoading(true);
    const result = await onFileSelect(file.path);
    setSelectedFile(result);
    setLoading(false);
  }

  // 处理文件或目录点击
  const handleItemClick = async (file: T) => {
    if (file.isDirectory) {
      // 如果是目录，则导航到该目录
      await navigateToDirectory(file.path);
      return
    }
    // 如果是文件，则选择该文件
    await handleFileSelect(file);
  };
  
  // 请求下载文件
  const handleFileDownload = (file: T) => {
    console.log('handleFileDownload', file);
  };
  
  // 获取文件图标
  const getCustomFileIcon = (file: T) => {
    // 如果提供了自定义图标渲染器，使用它
    if (renderFileIcon) {
      return renderFileIcon(file);
    }
    
    // 使用默认图标
    return getFileIcon(file);
  };

  // 刷新当前目录
  const refreshCurrentDirectory = async () => {
    await fetchFiles(currentPath);
  };

  return (
    <Card className="overflow-hidden">
      <FileBrowserHeader 
        title="File Browser" 
        breadcrumbs={breadcrumbs} 
        onBreadcrumbClick={navigateToBreadcrumb} 
        onRefresh={refreshCurrentDirectory} 
      />
      
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-2/3 border-r">
            <FileList 
              files={currentFiles} 
              selectedFile={selectedFile} 
              isLoading={loading} 
              getFileIcon={getCustomFileIcon} 
              onItemClick={handleItemClick} 
            />
          </div>
          
          {selectedFile && (
            <div className="w-full md:w-1/3">
              <FilePreview 
                file={selectedFile} 
                getFileIcon={getCustomFileIcon} 
                onDownload={handleFileDownload} 
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 