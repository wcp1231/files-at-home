import { useEffect } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import useFileSystemStore from '@/store/fileSystemStore';
import type { FileItem } from '@/store/fileSystemStore';
import { formatFileSize, getFileIcon } from '@/utils/fileUtils';

// 文件管理器属性接口
interface FileManagerProps {
  initialPath?: string;
  onFileSelect?: (file: FileItem) => void;
}

export default function FileManager({ initialPath = '/', onFileSelect }: FileManagerProps) {
  // 使用 Zustand store
  const {
    currentPath,
    files,
    loading,
    error,
    selectedFile,
    breadcrumbs,
    setCurrentPath,
    openDir,
    selectFile,
    navigateUp,
    navigateToBreadcrumb
  } = useFileSystemStore();

  // 初始化和路径变化时获取文件
  useEffect(() => {
    setCurrentPath(initialPath);
  }, [initialPath, setCurrentPath]);

  // 处理文件或目录点击
  const handleItemClick = (item: FileItem) => {
    if (item.isDirectory) {
      // 如果是目录，则导航到该目录
      setCurrentPath(item.path.endsWith('/') ? item.path : `${item.path}/`);
      openDir(item.path);
    } else {
      // 如果是文件，则选择该文件
      selectFile(item);
      if (onFileSelect) {
        onFileSelect(item);
      }
    }
  };

  // 渲染文件预览
  const renderFilePreview = () => {
    if (!selectedFile) return null;
    
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
          <div>{selectedFile.modifiedAt?.toLocaleDateString()}</div>
          <div>Path:</div>
          <div className="truncate">{selectedFile.path}</div>
        </div>
        {selectedFile.type?.startsWith('image/') && (
          <div className="mt-4">
            <p className="text-gray-500 text-sm mb-2">Preview:</p>
            <div className="border rounded bg-gray-50 p-2 flex items-center justify-center">
              {/* 在实际应用中，这里应该是真实的图片URL */}
              <div className="text-gray-400 italic">Image preview would appear here</div>
            </div>
          </div>
        )}
      </div>
    );
  };

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
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
              {error}
            </div>
          )}
          
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
                    {files.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                          This folder is empty
                        </td>
                      </tr>
                    ) : (
                      files.map((file) => (
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
                            {file.modifiedAt?.toLocaleDateString() || '--'}
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