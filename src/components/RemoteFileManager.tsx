import { useEffect, useState } from 'react';
import useWebRTCStore from '@/store/webrtcStore';
import { SharedFileInfo } from '@/utils/webrtcUtils';
import { FaFolder, FaFile, FaArrowLeft } from 'react-icons/fa';

interface RemoteFileManagerProps {
  onFileSelect?: (file: SharedFileInfo) => void;
  onDirectorySelect?: (directory: SharedFileInfo) => void;
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export default function RemoteFileManager({ onFileSelect, onDirectorySelect }: RemoteFileManagerProps) {
  const [currentPath, setCurrentPath] = useState('/');
  const [currentFiles, setCurrentFiles] = useState<SharedFileInfo[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['/']);
  const [selectedFile, setSelectedFile] = useState<SharedFileInfo | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { 
    remoteFiles, 
    requestFile,
    requestDirectory
  } = useWebRTCStore();
  
  // 当远程文件列表变化时更新当前目录的文件
  useEffect(() => {
    updateCurrentFiles();
  }, [remoteFiles, currentPath]);
  
  // 更新当前目录的文件
  const updateCurrentFiles = () => {
    setLoading(true);
    
    if (!remoteFiles.length) {
      setCurrentFiles([]);
      setLoading(false);
      return;
    }
    
    setCurrentFiles(remoteFiles);
    setLoading(false);
  };
  
  // 处理文件或目录点击
  const handleItemClick = (file: SharedFileInfo) => {
    if (file.isDirectory) {
      // 如果是目录，则导航到该目录
      navigateToDirectory(file.path);
      if (onDirectorySelect) {
        onDirectorySelect(file);
      }
    } else {
      // 如果是文件，则选择该文件
      setSelectedFile(file);
      if (onFileSelect) {
        onFileSelect(file);
      }
    }
  };
  
  // 导航到目录
  const navigateToDirectory = (path: string) => {
    setCurrentPath(path);
    requestDirectory(path)
    
    // 更新面包屑
    const pathParts = path.split('/').filter(Boolean);
    setBreadcrumbs(['/', ...pathParts]);
  };
  
  // 导航到面包屑
  const navigateToBreadcrumb = (index: number) => {
    if (index === 0) {
      navigateToDirectory('/');
    } else {
      const pathParts = breadcrumbs.slice(1, index + 1);
      navigateToDirectory(`/${pathParts.join('/')}/`);
    }
  };
  
  // 导航到上一级目录
  const navigateUp = () => {
    if (currentPath === '/') return;
    
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();
    const newPath = pathParts.length ? `/${pathParts.join('/')}/` : '/';
    
    navigateToDirectory(newPath);
  };
  
  // 请求下载文件
  const handleFileRequest = (file: SharedFileInfo) => {
    if (!file.isDirectory) {
      requestFile(file.path);
    }
  };
  
  // 渲染文件预览
  const renderFilePreview = () => {
    if (!selectedFile) return null;
    
    return (
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h3 className="text-lg font-medium mb-2">{selectedFile.name}</h3>
        <div className="mb-4">
          {selectedFile.isDirectory ? (
            <FaFolder className="text-yellow-500 inline mr-2" />
          ) : (
            <FaFile className="text-gray-400 inline mr-2" />
          )}
          <span>{selectedFile.type || 'Unknown type'}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Size:</div>
          <div>{selectedFile.size ? formatFileSize(selectedFile.size) : '--'}</div>
          <div>Modified:</div>
          <div>{selectedFile.modifiedAt ? new Date(selectedFile.modifiedAt).toLocaleDateString() : '--'}</div>
          <div>Path:</div>
          <div className="truncate">{selectedFile.path}</div>
        </div>
        {!selectedFile.isDirectory && (
          <div className="mt-4">
            <button
              onClick={() => handleFileRequest(selectedFile)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              Download File
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-white border-b">
        <h2 className="text-xl font-semibold">Remote Files</h2>
        
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
          {loading ? (
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
                                {file.isDirectory ? (
                                  <FaFolder className="text-yellow-500" />
                                ) : (
                                  <FaFile className="text-gray-400" />
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {file.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {file.isDirectory ? '--' : (file.size ? formatFileSize(file.size) : '--')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {file.modifiedAt ? new Date(file.modifiedAt).toLocaleDateString() : '--'}
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