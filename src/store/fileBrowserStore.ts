import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { FileViewEntry } from '@/components/filebrowser/FileBrowser';
import { FileTransfer } from '@/lib/webrtc/types';
import { isVideoFile, isPdfFile, isImageFile, isAudioFile } from '@/utils/browserUtil';
import { toast } from '@/hooks/use-toast';

// 定义 store 的状态和操作
interface FileBrowserState<FileViewEntry> {
  // State
  showOperations: boolean;
  packable: boolean;
  writeable: boolean;

  currentPath: string;
  currentFiles: FileViewEntry[];
  breadcrumbs: string[];
  selectedFile: FileViewEntry | null;
  selectedFileTransfer: FileTransfer | null;
  loading: boolean;
  videoUrl: string | null;
  videoDialogOpen: boolean;
  pdfUrl: string | null;
  pdfDialogOpen: boolean;
  imageUrl: string | null;
  imageDialogOpen: boolean;
  audioUrl: string | null;
  audioDialogOpen: boolean;

  // 设置功能
  setFeatures: (features: {
    showOperations: boolean;
    packable: boolean;
    writeable: boolean;
  }) => void;

  // 回调函数
  onFileSelect?: (path: string) => Promise<FileViewEntry | null>;
  onFileData?: (path: string) => Promise<Blob | null>;
  onDirectorySelect?: (path: string) => Promise<FileViewEntry[]>;
  setVideoUrl: (url: string | null) => void;
  setVideoDialogOpen: (open: boolean) => void;
  setPdfUrl: (url: string | null) => void;
  setPdfDialogOpen: (open: boolean) => void;
  setImageUrl: (url: string | null) => void;
  setImageDialogOpen: (open: boolean) => void;
  setAudioUrl: (url: string | null) => void;
  setAudioDialogOpen: (open: boolean) => void;
  
  // 设置回调函数
  setCallbacks: (callbacks: {
    onFileSelect?: (path: string) => Promise<FileViewEntry | null>;
    onFileData?: (path: string) => Promise<Blob | null>;
    onDirectorySelect?: (path: string) => Promise<FileViewEntry[]>;
  }) => void;

  // Actions
  setCurrentPath: (path: string) => void;
  setCurrentFiles: (files: FileViewEntry[]) => void;
  setBreadcrumbs: (breadcrumbs: string[]) => void;
  setSelectedFile: (file: FileViewEntry | null) => void;
  setSelectedFileTransfer: (fileTransfer: FileTransfer | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Operations
  fetchFiles: (path: string) => Promise<void>;
  navigateToDirectory: (path: string) => Promise<void>;
  navigateToBreadcrumb: (index: number) => Promise<void>;
  navigateUp: () => Promise<void>;
  handleFileSelect: (file: FileViewEntry) => Promise<void>;
  handleItemClick: (file: FileViewEntry) => Promise<void>;
  handleFileDownload: (file: FileViewEntry) => void;
  handlePlayVideo: (file: FileViewEntry) => void;
  handleViewPdf: (file: FileViewEntry) => void;
  handleViewImage: (file: FileViewEntry) => void;
  handlePlayAudio: (file: FileViewEntry) => void;
  refreshCurrentDirectory: () => Promise<void>;
  
  // 初始化
  initialize: (path: string) => Promise<void>;
  // 清理
  cleanup: () => void;
}

// 创建一个泛型工厂函数来生成特定类型的store
export const createFileBrowserStore = () => {
  return create<FileBrowserState<FileViewEntry>>()(
    immer((set, get) => ({
      // 初始状态
      showOperations: false,
      packable: false,
      writeable: false,

      currentPath: '/',
      currentFiles: [] as FileViewEntry[],
      breadcrumbs: ['/'],
      selectedFile: null,
      selectedFileTransfer: null,
      loading: false,
      videoDialogOpen: false,
      videoUrl: null,
      pdfDialogOpen: false,
      pdfUrl: null,
      imageDialogOpen: false,
      imageUrl: null,
      audioDialogOpen: false,
      audioUrl: null,
      
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

      setFeatures: (features) => set((state) => {
        state.showOperations = features.showOperations;
        state.packable = features.packable;
        state.writeable = features.writeable;
      }),

      // 基础状态设置函数
      setCurrentPath: (path) => set((state) => {
        state.currentPath = path;
      }),
      setCurrentFiles: (files) => set((state) => {
        state.currentFiles = files;
      }),
      setBreadcrumbs: (breadcrumbs) => set((state) => {
        state.breadcrumbs = breadcrumbs;
      }),
      setSelectedFile: (file) => set((state) => {
        state.selectedFile = file;
      }),
      setSelectedFileTransfer: (fileTransfer) => set((state) => {
        state.selectedFileTransfer = fileTransfer;
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
      setPdfUrl: (url) => set((state) => {
        state.pdfUrl = url;
      }),
      setPdfDialogOpen: (open) => set((state) => {
        state.pdfDialogOpen = open;
      }),
      setImageUrl: (url) => set((state) => {
        state.imageUrl = url;
      }),
      setImageDialogOpen: (open) => set((state) => {
        state.imageDialogOpen = open;
      }),
      setAudioUrl: (url) => set((state) => {
        state.audioUrl = url;
      }),
      setAudioDialogOpen: (open) => set((state) => {
        state.audioDialogOpen = open;
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
            state.currentFiles = files;
          });
        } catch (error) {
          toast({
            title: '无法加载文件',
            description: error instanceof Error ? error.message : String(error),
          });
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
        const { onFileSelect, currentFiles, selectedFile } = get();
        if (!onFileSelect) return;
        
        // 如果已经选中了这个文件，不要重复请求
        if (selectedFile && selectedFile.path === file.path) {
          return;
        }
        
        try {
          const result = await onFileSelect(file.path);
          const index = currentFiles.findIndex((f) => f.path === file.path);
          const newFiles = [...currentFiles];
          if (index !== -1) {
            newFiles[index] = result as FileViewEntry;
          }
          set((state) => {
            state.selectedFile = result;
            state.currentFiles = newFiles;
          });
        } catch (error) {
          toast({
            title: '无法选择文件',
            description: error instanceof Error ? error.message : String(error),
          });
        }
      },

      // 处理文件或目录点击
      handleItemClick: async (file) => {
        const { navigateToDirectory, handleFileSelect, onFileSelect } = get();
        
        if (file.isDirectory) {
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
        let contentType = 'application/octet-stream';
        // // 判断是不是 safari
        if (navigator.userAgent.includes('Safari')) {
          // 兼容 ios safari 浏览器
          // 否则下载的文件都会是 html 格式
          contentType = file.type || 'application/octet-stream';
        }
        const downloadUrl = `/access?path=${file.path}&name=${file.name}&size=${file.size}type=${contentType}#download`;
        const iframe = document.createElement('iframe');
        iframe.setAttribute('id', file.path);
        iframe.hidden = true
        iframe.style.display = "none";
        iframe.src = downloadUrl;
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
            setVideoUrl(`/access?path=${file.path}&size=${file.size}&chunkSize=${chunkSize}&type=${file.type}#play`);
            setVideoDialogOpen(true);
          } catch (error) {
            toast({
              title: '无法播放视频',
              description: error instanceof Error ? error.message : String(error),
            });
          }
        }
      },

      handleViewPdf: async (file: FileViewEntry) => {
        const { setPdfUrl, setPdfDialogOpen } = get();
        if (isPdfFile(file)) {
          try {
            // 创建URL用于PDF查看
            setPdfUrl(`/access?path=${file.path}&size=${file.size}&type=${file.type}#download`);
            setPdfDialogOpen(true);
          } catch (error) {
            toast({
              title: '无法查看PDF',
              description: error instanceof Error ? error.message : String(error),
            });
          }
        }
      },

      handleViewImage: async (file) => {
        const { setImageUrl, setImageDialogOpen } = get();
        if (isImageFile(file)) {
          try {
            // 创建URL用于PDF查看
            setImageUrl(`/access?path=${file.path}&size=${file.size}&type=${file.type}#download`);
            setImageDialogOpen(true);
          } catch (error) {
            toast({
              title: '无法查看图片',
              description: error instanceof Error ? error.message : String(error),
            });
          }
        }
      },

      handlePlayAudio: async (file) => {
        const { setAudioUrl, setAudioDialogOpen } = get();
        if (isAudioFile(file)) {
          try {
            setAudioUrl(`/access?path=${file.path}&size=${file.size}&type=${file.type}#download`);
            setAudioDialogOpen(true);
          } catch (error) {
            toast({
              title: '无法播放音频',
              description: error instanceof Error ? error.message : String(error),
            });
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
        state.videoUrl = null;
        state.videoDialogOpen = false;
        state.pdfUrl = null;
        state.pdfDialogOpen = false;
        state.imageUrl = null;
        state.imageDialogOpen = false;
        state.audioUrl = null;
        state.audioDialogOpen = false;
        state.onFileSelect = undefined;
        state.onFileData = undefined;
        state.onDirectorySelect = undefined;
      }),
    }))
  );
};

// 创建一个全局的 store 实例
export const useFileBrowserStore = createFileBrowserStore();