import { useEffect, useState, useRef } from "react";
import { FSEntry, FSDirectory, FSFile, FilesFSDirectory, FileFSFile } from "@/lib/filesystem";
import { toast } from "./use-toast";

declare global {
  interface Window {
    showDirectoryPicker: (options?: { mode?: "readwrite" | "readonly" }) => Promise<FileSystemDirectoryHandle>;
  }
}

export function useFileSystem() {
  const [status, setStatus] = useState<{ error?: string, status?: string, loading: boolean }>({ loading: false });
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isSelectFilesMode, setIsSelectFilesMode] = useState<boolean>(false);
  const [rootDirHandle, setRootDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const rootDirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const handlesCache = useRef<Map<string, FSEntry>>(new Map());
  
  useEffect(() => {
    rootDirHandleRef.current = rootDirHandle;
  }, [rootDirHandle]);

  // Check if the File System Access API is supported
  const isFileSystemAccessSupported = () => {
    return 'showDirectoryPicker' in window;
  };

  // Open dir
  async function openDirectory() {
    try {
      const dirHandle = await window.showDirectoryPicker(/*{ mode: "readwrite" }*/);
      if (dirHandle) {
        handlesCache.current.set('/', new FSDirectory(dirHandle, dirHandle.name, '/'));
        setRootDirHandle(dirHandle);
        setIsInitialized(true);
      } else {
        throw new Error("Failed to open directory handle. `dirHandle` created but empty"); // not sure wether this is reachiable
      }
    } catch (error) {
      toast({
        title: '无法打开目录',
        description: error instanceof Error ? error.message : String(error),
      });
      setStatus({ error: error as string, loading: false });
    }
  }

  async function getFile(path: string) {
    if (isSelectFilesMode) {
      return getFileFromFiles(handlesCache.current, setStatus, path);
    }
    return getFileFromHandle(rootDirHandleRef.current, handlesCache.current, setStatus, path);
  }

  async function listFiles(path: string): Promise<FSEntry[] | null> {
    if (isSelectFilesMode) {
      return listFilesFromFiles(files, handlesCache.current);
    }

    return listFilesFromHandle(rootDirHandleRef.current, handlesCache.current, setStatus, path);
  }

  async function getDirectory(path: string, recursive: boolean) {
    if (isSelectFilesMode) {
      return getDirectoryFromFiles(files);
    }
    return getDirectoryFromHandle(rootDirHandleRef.current, handlesCache.current, setStatus, path, recursive);
  }

  // 兼容 ios 选择文件
  function onFilesSelected(files: File[]) {
    setFiles(files);
    setIsSelectFilesMode(true);
    setIsInitialized(true);
  }

  function onClose() {
    setIsSelectFilesMode(false);
    setRootDirHandle(null);
    setFiles([]);
    setIsInitialized(false);
  }

  return {
    status,
    rootDirHandle,
    isInitialized,
    openDirectory,
    getFile,
    listFiles,
    getDirectory,
    isFileSystemAccessSupported,
    onFilesSelected,
    onClose,
  }
}

function getDirectoryFromFiles(files: File[]) {
  return new FilesFSDirectory(files, 'root', '/');
}

function getDirectoryFromHandle(rootDirHandleRef: FileSystemDirectoryHandle | null, fileMap: Map<string, FSEntry>, setStatus: (status: { error?: string, loading: boolean }) => void, path: string, recursive: boolean) {
  if (!rootDirHandleRef) {
    setStatus({ error: "No directory handle opened", loading: false });
    return null;
  }
  const currentHandle = findDirectory(fileMap, path, recursive);
  if (!currentHandle) {
    setStatus({ error: "Directory not found", loading: false });
    return null;
  }
  if (!(currentHandle instanceof FSDirectory)) {
    setStatus({ error: "Not a directory", loading: false });
    return null;
  }
  return currentHandle;
}

async function listFilesFromFiles(files: File[], fileMap: Map<string, FSEntry>) {
  const result =  files.map((file) => new FileFSFile(file, file.name, '/' + file.name));
  result.forEach((file) => {
    fileMap.set(file.path, file);
  });
  return result;
}

async function listFilesFromHandle(rootDirHandleRef: FileSystemDirectoryHandle | null, fileMap: Map<string, FSEntry>, setStatus: (status: { error?: string, loading: boolean }) => void, path: string) {
  if (!rootDirHandleRef) {
    setStatus({ error: "No directory handle opened", loading: false });
    return [];
  }
  const currentHandle = fileMap.get(path);
  if (!currentHandle) {
    setStatus({ error: "Directory not found", loading: false });
    return [];
  }
  if (!(currentHandle instanceof FSDirectory)) {
    setStatus({ error: "Not a directory", loading: false });
    return [];
  }
  const files = await (currentHandle as FSDirectory).getFiles();
  files.forEach((file) => {
    fileMap.set(file.path, file);
  });
  return files;
}

async function getFileFromHandle(rootDirHandleRef: FileSystemDirectoryHandle | null, fileMap: Map<string, FSEntry>, setStatus: (status: { error?: string, loading: boolean }) => void, path: string) {
  if (!rootDirHandleRef) {
    setStatus({ error: "No directory handle opened", loading: false });
    return null;
  }
  try {
    const currentHandle = fileMap.get(path);
    if (!currentHandle) {
      setStatus({ error: "File not found", loading: false });
      return null;
    }
    if (!(currentHandle instanceof FSFile)) {
      setStatus({ error: "Not a file", loading: false });
      return null;
    }
    await (currentHandle as FSFile).getFile();
    return currentHandle;
  } catch (error) {
    setStatus({ error: error as string, loading: false });
    return null;
  }
}

async function getFileFromFiles(fileMap: Map<string, FSEntry>, setStatus: (status: { error?: string, loading: boolean }) => void, path: string) {
  try {
    const currentHandle = fileMap.get(path);
    if (!currentHandle) {
      setStatus({ error: "File not found", loading: false });
      return null;
    }
    if (!(currentHandle instanceof FileFSFile)) {
      setStatus({ error: "Not a file", loading: false });
      return null;
    }
    return currentHandle;
  } catch (error) {
    setStatus({ error: error as string, loading: false });
    return null;
  }
}

function findDirectory(fileMap: Map<string, FSEntry>, path: string, recursive: boolean = false): FSDirectory | null {
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
  const parentDirectory = findDirectory(fileMap, currentPath, true);
  if (parentDirectory) {
    return parentDirectory.files.find((file) => file.name === dirName) as FSDirectory;
  }
  return null;
}
