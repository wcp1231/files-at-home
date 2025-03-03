import { create } from 'zustand';

// 文件类型接口
export class FileItem {
  handle: FileSystemHandle;
  name: string;
  path: string;
  size?: number;
  modifiedAt?: Date;
  type?: string;

  constructor(handle: FileSystemHandle, name: string, path: string) {
    this.handle = handle;
    this.name = name;
    this.path = path;
  }

  get isDirectory() {
    return this.handle instanceof FileSystemDirectoryHandle;
  }

  async getFileMetadata() {
    if (!this.isDirectory) {
      const file = await (this.handle as FileSystemFileHandle).getFile();
      this.size = file.size;
      this.type = file.type;
      this.modifiedAt = new Date(file.lastModified);
    }
  }
}

// 文件系统状态接口
interface FileSystemState {
  // 状态

  // 每个文件和目录的句柄
  rootDir: FileSystemDirectoryHandle | null;
  fileMap?: Map<string, FileItem>;
  currentPath: string;
  files: FileItem[];
  loading: boolean;
  error: string | null;
  selectedFile: FileItem | null;
  breadcrumbs: string[];
  
  // 操作
  setRootDir: (rootDir: FileSystemDirectoryHandle) => void;
  setFileItem: (path: string, fileItem: FileItem) => void;
  setCurrentPath: (path: string) => void;
  openDir: (path: string) => Promise<void>;
  selectFile: (file: FileItem | null) => void;
  navigateUp: () => void;
  navigateToBreadcrumb: (index: number) => void;
}

// 创建 store
const useFileSystemStore = create<FileSystemState>((set, get) => ({
  // 初始状态
  rootDir: null,
  fileMap: new Map<string, FileItem>(),
  currentPath: '/',
  files: [],
  loading: false,
  error: null,
  selectedFile: null,
  breadcrumbs: ['/'],
  
  // 设置根目录
  setRootDir: (rootDir: FileSystemDirectoryHandle) => {
    set((state) => ({ 
      rootDir: rootDir, 
      fileMap: new Map(state.fileMap).set('/', new FileItem(rootDir, 'root', '/'))
    }));
  },
  
  // 设置句柄
  setFileItem: (path: string, fileItem: FileItem) => {
    set((state) => ({ fileMap: new Map(state.fileMap).set(path, fileItem) }));
  },

  // 设置当前路径
  setCurrentPath: (path: string) => {
    set({ currentPath: path });
    get().openDir(path);
  },

  openDir: async (path: string) => {
    set({ loading: true, error: null });
    try {
      const fileItem = get().fileMap?.get(path);
      if (!fileItem) {
        throw new Error('文件不存在');
      }
      if (!fileItem.isDirectory) {
        throw new Error('不是目录');
      }
      const files: FileItem[] = [];
      const dirHandle = fileItem.handle as FileSystemDirectoryHandle;
      for await (const [name, handle] of dirHandle.entries()) {
        console.log('entry', name, handle);
        const filePath = `${path}${name}/`;
        const fileItem = new FileItem(handle, name, filePath);
        await fileItem.getFileMetadata();
        get().setFileItem(filePath, fileItem);
        files.push(fileItem);
      }
      // 更新状态
      const pathParts = path.split('/').filter(Boolean);
      set({ 
        files: files, 
        loading: false,
        breadcrumbs: ['/', ...pathParts]
      })
    } catch (err) {
      set({ 
        error: '加载文件失败，请重试。', 
        loading: false 
      });
      console.error('Error fetching files:', err);
    }
  },
  
  // 选择文件
  selectFile: (file: FileItem | null) => {
    set({ selectedFile: file });
  },
  
  // 返回上一级目录
  navigateUp: () => {
    const { currentPath } = get();
    if (currentPath === '/') return;
    
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();
    const newPath = pathParts.length ? `/${pathParts.join('/')}/` : '/';
    
    set({ selectedFile: null });
    get().setCurrentPath(newPath);
  },
  
  // 导航到面包屑指定的路径
  navigateToBreadcrumb: (index: number) => {
    const { breadcrumbs } = get();
    
    if (index === 0) {
      get().setCurrentPath('/');
    } else {
      const pathParts = breadcrumbs.slice(1, index + 1);
      get().setCurrentPath(`/${pathParts.join('/')}/`);
    }
    
    set({ selectedFile: null });
  }
}));

export default useFileSystemStore; 