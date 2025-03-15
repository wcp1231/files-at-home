import { useEffect, useState, useRef } from "react";
import { FSEntry, FSDirectory, FSFile } from "@/lib/filesystem";

declare global {
  interface Window {
    showDirectoryPicker: (options?: { mode?: "readwrite" | "readonly" }) => Promise<FileSystemDirectoryHandle>;
  }
}

export function useFileSystem() {
  const [status, setStatus] = useState<{ error?: string, status?: string, loading: boolean }>({ loading: false });
  const [rootDirHandle, setRootDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const rootDirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const handlesCache = useRef<Map<string, FSEntry>>(new Map());
  
  useEffect(() => {
    rootDirHandleRef.current = rootDirHandle;
  }, [rootDirHandle]);

    // Open dir
  async function openDirectory() {
    try {
      const dirHandle = await window.showDirectoryPicker(/*{ mode: "readwrite" }*/);
      if (dirHandle) {
        console.log("Directory handle opened.");
        handlesCache.current.set('/', new FSDirectory(dirHandle, dirHandle.name, '/'));
        setRootDirHandle(dirHandle);
      } else {
        throw new Error("Failed to open directory handle. `dirHandle` created but empty"); // not sure wether this is reachiable
      }
    } catch (error) {
      console.error(error);
      setStatus({ error: error as string, loading: false });
    }
  }

  async function getFile(path: string) {
    if (!rootDirHandleRef.current) {
      setStatus({ error: "No directory handle opened", loading: false });
      return null;
    }
    try {
      const currentHandle = handlesCache.current.get(path);
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

  async function listFiles(path: string): Promise<FSEntry[] | null> {
    if (!rootDirHandleRef.current) {
      setStatus({ error: "No directory handle opened", loading: false });
      return [];
    }
    const currentHandle = handlesCache.current.get(path);
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
      handlesCache.current.set(file.path, file);
    });
    return files;
  }

  async function getDirectory(path: string, recursive: boolean) {
    if (!rootDirHandleRef.current) {
      setStatus({ error: "No directory handle opened", loading: false });
      return null;
    }
    const currentHandle = findDirectory(handlesCache.current, path, recursive);
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

  return {
    status,
    rootDirHandle,
    openDirectory,
    getFile,
    listFiles,
    getDirectory,
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
