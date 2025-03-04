import { create } from 'zustand';

class BaseFSEntry {
  handle: FileSystemHandle;
  name: string;
  path: string;

  constructor(handle: FileSystemHandle, name: string, path: string) {
    this.handle = handle;
    this.name = name;
    this.path = path;
  }
}

export type FSEntry = FSDirectory | FSFile;

export class FSDirectory extends BaseFSEntry {
  files: FSEntry[] = [];

  constructor(handle: FileSystemDirectoryHandle, name: string, path: string) {
    super(handle, name, path);
  }

  async getFiles() {
    if (this.files.length > 0) {
      return this.files;
    }
    const files = [];
    for await (const [name, handle] of this.handle.entries()) {
      if (handle instanceof FileSystemDirectoryHandle) {
        files.push(new FSDirectory(handle, name, `${this.path}${name}/`));
      } else if (handle instanceof FileSystemFileHandle) {
        files.push(new FSFile(handle, name, `${this.path}${name}`));
      }
    }
    this.files = files;
    return this.files;
  }
}
export class FSFile extends BaseFSEntry {
  file?: File;
  size?: number;
  modifiedAt?: Date;
  type?: string;
  constructor(handle: FileSystemFileHandle, name: string, path: string) {
    super(handle, name, path);
  }

  async getFile() {
    if (!this.file) { 
      this.file = await (this.handle as FileSystemFileHandle).getFile();
      this.size = this.file.size;
      this.type = this.file.type;
      this.modifiedAt = new Date(this.file.lastModified);
    }
    return this.file;
  }
}

// 文件系统状态接口
interface FileSystemState {
  // 状态

  // 每个文件和目录的句柄
  rootDir: FileSystemDirectoryHandle | null;
  fileMap?: Map<string, FSEntry>;
  currentPath: string;
  files: FSEntry[];
  loading: boolean;
  error: string | null;
  selectedFile: FSFile | null;
  breadcrumbs: string[];
  
  // 操作
  setRootDir: (rootDir: FileSystemDirectoryHandle) => void;
  setDirectory: (directory: FSDirectory) => void;
  setFiles: (files: FSEntry[]) => void;
  setCurrentPath: (path: string) => void;
  selectDirectory: (path: string) => Promise<void>;
  selectFile: (filePath: string) => void;
  getDirectory: (path: string, recursive: boolean) => FSDirectory | null;
  getFile: (filePath: string) => FSFile | null;
  navigateUp: () => void;
  navigateToBreadcrumb: (index: number) => void;
}

// 创建 store
const useFileSystemStore = create<FileSystemState>((set, get) => ({
  // 初始状态
  rootDir: null,
  fileMap: new Map<string, FSEntry>(),
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
      fileMap: new Map(state.fileMap).set('/', new FSDirectory(rootDir, 'root', '/'))
    }));
  },

  // 设置目录
  setDirectory: (directory: FSDirectory) => {
    set((state) => ({ fileMap: new Map(state.fileMap).set(directory.path, directory) }));
  },

  // 设置文件
  setFiles: (files: FSEntry[]) => {
    set((state) => {
      const newFileMap = new Map(state.fileMap);
      files.forEach((file) => {
        newFileMap.set(file.path, file);
      });
      return { fileMap: newFileMap };
    });
  },

  // 设置当前路径
  setCurrentPath: (path: string) => {
    set({ currentPath: path });
    get().selectDirectory(path);
  },

  selectDirectory: async (path: string) => {
    try {
      const fileMap = get().fileMap;
      const fileItem = fileMap?.get(path);
      if (!fileItem) {
        throw new Error('文件不存在');
      }
      if (!(fileItem instanceof FSDirectory)) {
        throw new Error('不是目录');
      }
      const newFileMap = new Map(fileMap);
      const files = await (fileItem as FSDirectory).getFiles();
      files.forEach((file) => {
        newFileMap.set(file.path, file);
      });
      // 更新状态
      const pathParts = path.split('/').filter(Boolean);
      set({ 
        fileMap: newFileMap,
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
  selectFile: (filePath: string) => {
    try {
      const file = get().fileMap?.get(filePath);
      if (!file) {
        throw new Error('文件不存在');
      }
      if (!(file instanceof FSFile)) {
        throw new Error('不是文件');
      }
      set({ selectedFile: file as FSFile });
    } catch (err) {
      set({ error: '选择文件失败，请重试。', loading: false });
      console.error('Error selecting file:', err);
    }
  },

  getDirectory: (path: string, recursive: boolean) => {
    const { fileMap } = get();
    return getDirectory(fileMap, path, recursive);
  },

  getFile: (filePath: string) => {
    return get().fileMap?.get(filePath) as FSFile || null;
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

function getDirectory(fileMap: Map<String, FSEntry> | undefined, path: string, recursive: boolean = false): FSDirectory | null {
  if (!fileMap) {
    return null;
  }
  const directory = fileMap.get(path) as FSDirectory | null;
  if (directory) {
    return directory;
  }
  if (!recursive) {
    return null;
  }
  const pathParts = path.split('/').filter(Boolean);
  const dirName = pathParts.pop();
  const currentPath = '/' + pathParts.join('/');
  const parentDirectory = getDirectory(fileMap, currentPath, true);
  if (parentDirectory) {
    return parentDirectory.files.find((file) => file.name === dirName) as FSDirectory;
  }
  return null;
}