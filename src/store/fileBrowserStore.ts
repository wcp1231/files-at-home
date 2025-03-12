import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { FileViewEntry } from '@/components/filebrowser/FileBrowser';
import { FileTransfer } from '@/lib/webrtc/types';
import { isVideoFile } from '@/utils/browserUtil';

// 定义 store 的状态和操作
interface FileBrowserState<T extends FileViewEntry> {
  // State
  currentPath: string;
  currentFiles: T[];
  breadcrumbs: string[];
  selectedFile: T | null;
  selectedFileTransfer: FileTransfer | null;
  loading: boolean;
  videoUrl: string | null;
  videoDialogOpen: boolean;

  // 回调函数
  onFileSelect?: (path: string) => Promise<T | null>;
  onFileData?: (path: string) => Promise<Blob | null>;
  onDirectorySelect?: (path: string) => Promise<T[]>;
  setVideoUrl: (url: string | null) => void;
  setVideoDialogOpen: (open: boolean) => void;
  
  // 设置回调函数
  setCallbacks: (callbacks: {
    onFileSelect?: (path: string) => Promise<T | null>;
    onFileData?: (path: string) => Promise<Blob | null>;
    onDirectorySelect?: (path: string) => Promise<T[]>;
  }) => void;

  // Actions
  setCurrentPath: (path: string) => void;
  setCurrentFiles: (files: T[]) => void;
  setBreadcrumbs: (breadcrumbs: string[]) => void;
  setSelectedFile: (file: T | null) => void;
  setSelectedFileTransfer: (fileTransfer: FileTransfer | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Operations
  fetchFiles: (path: string) => Promise<void>;
  navigateToDirectory: (path: string) => Promise<void>;
  navigateToBreadcrumb: (index: number) => Promise<void>;
  navigateUp: () => Promise<void>;
  handleFileSelect: (file: T) => Promise<void>;
  handleItemClick: (file: T) => Promise<void>;
  handleFileDownload: (file: T) => void;
  handlePlayVideo: (file: T) => void;
  refreshCurrentDirectory: () => Promise<void>;
  
  // 初始化
  initialize: (path: string) => Promise<void>;
  // 清理
  cleanup: () => void;
}

// 创建一个泛型工厂函数来生成特定类型的store
export const createFileBrowserStore = <T extends FileViewEntry>() => {
  return create<FileBrowserState<T>>()(
    immer((set, get) => ({
      // 初始状态
      currentPath: '/',
      currentFiles: [] as T[],
      breadcrumbs: ['/'],
      selectedFile: null,
      selectedFileTransfer: null,
      loading: false,
      videoDialogOpen: false,
      
      // 回调函数
      onFileSelect: undefined,
      onFileData: undefined,
      onDirectorySelect: undefined,
      
      // 设置回调函数
      setCallbacks: (callbacks) => set((state) => {
        state.onFileSelect = callbacks.onFileSelect;
        state.onFileData = callbacks.onFileData;
        state.onDirectorySelect = callbacks.onDirectorySelect;
      }),

      // 基础状态设置函数
      setCurrentPath: (path) => set((state) => {
        state.currentPath = path;
      }),
      setCurrentFiles: (files) => set((state) => {
        state.currentFiles = files as any;  // 使用 any 类型绕过 immer 的类型检查
      }),
      setBreadcrumbs: (breadcrumbs) => set((state) => {
        state.breadcrumbs = breadcrumbs;
      }),
      setSelectedFile: (file) => set((state) => {
        state.selectedFile = file as any;  // 使用 any 类型绕过 immer 的类型检查
      }),
      setSelectedFileTransfer: (fileTransfer) => set((state) => {
        state.selectedFileTransfer = fileTransfer as any;  // 使用 any 类型绕过 immer 的类型检查
      }),
      setLoading: (loading) => set((state) => {
        state.loading = loading;
      }),
      setVideoUrl: (url) => set((state) => {
        state.videoUrl = url;
      }),
      setVideoDialogOpen: (open) => set((state) => {
        state.videoDialogOpen = open;
      }),

      // 获取文件列表
      fetchFiles: async (path) => {
        const { onDirectorySelect } = get();
        if (!onDirectorySelect) return;
        
        set((state) => {
          state.loading = true;
        });
        
        try {
          const files = await onDirectorySelect(path);
          set((state) => {
            state.currentFiles = files as any;  // 使用 any 类型绕过 immer 的类型检查
          });
        } catch (error) {
          console.error('Error loading files:', error);
        } finally {
          set((state) => {
            state.loading = false;
          });
        }
      },

      // 导航到目录
      navigateToDirectory: async (path) => {
        const { fetchFiles, onDirectorySelect } = get();
        
        // 确保路径以 / 结尾
        const normalizedPath = path.endsWith('/') ? path : `${path}/`;
        
        if (onDirectorySelect) {
          await fetchFiles(normalizedPath);
        }
        
        // 更新面包屑
        const pathParts = normalizedPath.split('/').filter(Boolean);
        
        set((state) => {
          state.currentPath = normalizedPath;
          state.breadcrumbs = ['/', ...pathParts];
        });
      },

      // 导航到面包屑
      navigateToBreadcrumb: async (index) => {
        const { navigateToDirectory } = get();
        const breadcrumbs = get().breadcrumbs;
        
        if (index === 0) {
          await navigateToDirectory('/');
        } else {
          const pathParts = breadcrumbs.slice(1, index + 1);
          await navigateToDirectory(`/${pathParts.join('/')}/`);
        }
      },

      // 导航到上一级目录
      navigateUp: async () => {
        const { currentPath, navigateToDirectory } = get();
        
        if (currentPath === '/') return;
        
        const pathParts = currentPath.split('/').filter(Boolean);
        pathParts.pop();
        const newPath = pathParts.length ? `/${pathParts.join('/')}/` : '/';
        
        await navigateToDirectory(newPath);
      },

      // 处理文件选择
      handleFileSelect: async (file) => {
        const { onFileSelect } = get();
        if (!onFileSelect) return;
        
        // 如果已经选中了这个文件，不要重复请求
        const currentSelectedFile = get().selectedFile;
        if (currentSelectedFile && currentSelectedFile.path === file.path) {
          return;
        }
        
        try {
          const result = await onFileSelect(file.path);
          set((state) => {
            state.selectedFile = result as any;  // 使用 any 类型绕过 immer 的类型检查
          });
        } catch (error) {
          console.error('Error selecting file:', error);
        }
      },

      // 处理文件或目录点击
      handleItemClick: async (file) => {
        const { navigateToDirectory, handleFileSelect, onFileSelect } = get();
        
        if (file.isDirectory) {
          // 如果是目录，则导航到该目录
          await navigateToDirectory(file.path);
          return;
        }
        
        // 如果是文件，则选择该文件
        if (onFileSelect) {
          await handleFileSelect(file);
        }
      },

      // 请求下载文件
      handleFileDownload: (file) => {
        let iframe = document.createElement('iframe');
        iframe.setAttribute('id', file.path);
        iframe.hidden = true
        iframe.style.display = "none";
        iframe.src = `/receive?path=${file.path}&name=${file.name}&size=${file.size}#download`;
        iframe.onload = function() {
          document.body.removeChild(iframe);
        };
        document.body.appendChild(iframe);
      },

      handlePlayVideo: async (file) => {
        const { setVideoUrl, setVideoDialogOpen } = get();
        if (isVideoFile(file)) {
          try {
            const chunkSize = 512 * 1024;
            // 创建URL用于视频播放
            setVideoUrl(`/receive?path=${file.path}&size=${file.size}&chunkSize=${chunkSize}&type=${file.type}#play`);
            setVideoDialogOpen(true);
          } catch (error) {
            console.error('Error playing video:', error);
          }
        }
      },

      // 刷新当前目录
      refreshCurrentDirectory: async () => {
        const { currentPath, fetchFiles } = get();
        await fetchFiles(currentPath);
      },
      
      // 初始化
      initialize: async (path) => {
        const { navigateToDirectory } = get();
        await navigateToDirectory(path);
      },

      // 清理
      cleanup: () => set((state) => {
          state.currentPath = '/';
          state.currentFiles = [];
          state.breadcrumbs = ['/'];
          state.selectedFile = null;
          state.selectedFileTransfer = null;
          state.loading = false;
          state.onFileSelect = undefined;
          state.onFileData = undefined;
          state.onDirectorySelect = undefined;
        }),
    }))
  );
};

// 创建一个全局的 store 实例
export const useFileBrowserStore = createFileBrowserStore<FileViewEntry>();

// // 导出一个使用全局 store 的 hook
// export function useFileBrowserStore<T extends FileViewEntry>() {
//   return (globalFileBrowserStore as unknown as FileBrowserState<T>).getState();
// } 