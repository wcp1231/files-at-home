class BaseFSEntry {
  handle: FileSystemHandle | null;
  name: string;
  path: string;

  constructor(handle: FileSystemHandle | null, name: string, path: string) {
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
    for await (const [name, handle] of this.handle!.entries()) {
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

export class FilesFSDirectory extends BaseFSEntry {
  files: FileFSFile[] = [];

  constructor(files: File[], name: string, path: string) {
    super(null, name, path);
    this.files = files.map((file) => new FileFSFile(file, file.name, path));
  }

  async getFiles() {
    return this.files;
  }
}

export class FileFSFile extends BaseFSEntry {
  file: File;
  size?: number;
  modifiedAt?: Date;
  type?: string;

  constructor(file: File, name: string, path: string) {
    super(null, name, path);
    this.file = file;
    this.size = file.size;
    this.modifiedAt = new Date(file.lastModified);
    this.type = file.type;
  }

  async getFile() {
    return this.file;
  }
}
