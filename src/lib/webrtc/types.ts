// 添加 FileSystem API 的类型声明
declare global {
  interface FileSystemDirectoryHandle {
    entries(): AsyncIterable<[string, FileSystemHandle]>;
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  }
}

// 连接状态枚举
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

// 角色枚举
export enum PeerRole {
  HOST = 'host',
  CLIENT = 'client',
}

// 定义消息类型
export enum MessageType {
  DIRECTORY_REQUEST = 'DIRECTORY_REQUEST',
  FILE_REQUEST = 'FILE_REQUEST',
  FILE_DATA = 'FILE_DATA',
  ERROR = 'ERROR',
}

// 定义消息接口
export interface WebRTCMessage {
  type: MessageType;
  payload: any;
  requestId?: string;
}

// 定义文件信息接口
export interface SharedFileInfo {
  name: string;
  path: string;
  size?: number;
  isDirectory: boolean;
  modifiedAt?: string;
  type?: string;
}