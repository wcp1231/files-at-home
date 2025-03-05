import { useEffect, useState, ReactNode } from 'react';
import { FaFolder, FaFile, FaArrowLeft } from 'react-icons/fa';
import { formatFileSize } from '@/lib/filesystem/util';

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
interface UnifiedFileManagerProps<T extends FileViewEntry> {
  // Initial path
  initialPath?: string;

  // Callback handlers
  onFileSelect?: (path: string) => Promise<T | null>;
  onDirectorySelect?: (path: string) => Promise<T[]>;
  
  // Custom icon renderer
  renderFileIcon?: (file: T) => ReactNode;
}

export default function UnifiedFileManager<T extends FileViewEntry>({
  initialPath = '/',
  onFileSelect,
  onDirectorySelect,
  renderFileIcon,
}: UnifiedFileManagerProps<T>) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [currentFiles, setCurrentFiles] = useState<T[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['/']);
  const [selectedFile, setSelectedFile] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('initialPath', initialPath);
    navigateToDirectory(initialPath);
  }, [initialPath]);

  // 获取文件列表
  const fetchFiles = async (path: string) => {
    if (!onDirectorySelect) return;
    setLoading(true);
    try {
      const files = await onDirectorySelect(path);
      console.log('files', files);
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
    console.log('handleFileSelect', result);
    // TODO 后续处理，比如预览文件等
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
  const getFileIcon = (file: T) => {
    // 如果提供了自定义图标渲染器，使用它
    if (renderFileIcon) {
      return renderFileIcon(file);
    }
    
    // 默认图标
    return file.isDirectory ? 
      <FaFolder className="text-yellow-500" /> : 
      <FaFile className="text-gray-400" />;
  };
  
  // 渲染文件预览
  const renderFilePreview = () => {
    if (!selectedFile) return null;
    
    const modifiedDate = selectedFile.modifiedAt ? 
      (typeof selectedFile.modifiedAt === 'string' ? 
        new Date(selectedFile.modifiedAt) : 
        selectedFile.modifiedAt
      ).toLocaleDateString() : 
      '--';
    
    return (
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h3 className="text-lg font-medium mb-2">{selectedFile.name}</h3>
        <div className="mb-4">
          {getFileIcon(selectedFile)}
          <span className="ml-2">{selectedFile.type || 'Unknown type'}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Size:</div>
          <div>{formatFileSize(selectedFile.size)}</div>
          <div>Modified:</div>
          <div>{modifiedDate}</div>
          <div>Path:</div>
          <div className="truncate">{selectedFile.path}</div>
        </div>
        {!selectedFile.isDirectory && (
          <div className="mt-4">
            <button
              onClick={() => handleFileDownload(selectedFile)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              Download File
            </button>
          </div>
        )}
      </div>
    );
  };

  // 使用外部传入的loading状态或内部状态
  const isLoading = loading;

  return (
    <div className="bg-gray-50 rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-white border-b">
        <h2 className="text-xl font-semibold">File Manager</h2>
        
        {/* 面包屑导航 */}
        <div className="flex items-center mt-2 text-sm overflow-x-auto">
          {breadcrumbs.map((part, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <span className="mx-1 text-gray-400">/</span>}
              <button
                onClick={() => navigateToBreadcrumb(index)}
                className="hover:text-blue-500 truncate max-w-[150px]"
              >
                {index === 0 ? 'Home' : part}
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row">
        {/* 文件列表 */}
        <div className="w-full md:w-2/3 p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* 返回上一级按钮 */}
              {currentPath !== '/' && (
                <button
                  onClick={navigateUp}
                  className="flex items-center mb-4 text-sm text-gray-600 hover:text-blue-500"
                >
                  <FaArrowLeft className="mr-1" /> Back to parent directory
                </button>
              )}
              
              {/* 文件列表 */}
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Modified
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentFiles.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                          This folder is empty
                        </td>
                      </tr>
                    ) : (
                      currentFiles.map((file) => (
                        <tr 
                          key={file.path}
                          onClick={() => handleItemClick(file)}
                          className={`hover:bg-gray-50 cursor-pointer ${selectedFile?.path === file.path ? 'bg-blue-50' : ''}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-5 w-5">
                                {getFileIcon(file)}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {file.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {file.isDirectory ? '--' : formatFileSize(file.size)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {file.modifiedAt ? 
                              (typeof file.modifiedAt === 'string' ? 
                                new Date(file.modifiedAt) : 
                                file.modifiedAt
                              ).toLocaleDateString() : 
                              '--'
                            }
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        
        {/* 文件预览 */}
        <div className="w-full md:w-1/3 p-4 border-t md:border-t-0 md:border-l">
          {selectedFile ? (
            renderFilePreview()
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select a file to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 