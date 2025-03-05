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
  // 未连接
  DISCONNECTED = 'disconnected',
  // 初始化中
  INITIALIZING = 'initializing',
  // 等待连接
  WAITING_FOR_CONNECTION = 'waiting_for_connection',
  // 连接中
  CONNECTING = 'connecting',
  // 已连接
  CONNECTED = 'connected',
  // 连接错误
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
  DIRECTORY_RESPONSE = 'DIRECTORY_RESPONSE',
  FILE_INFO_REQUEST = 'FILE_INFO_REQUEST',
  FILE_DATA_REQUEST = 'FILE_DATA_REQUEST',
  FILE_INFO_RESPONSE = 'FILE_INFO_RESPONSE',
  FILE_DATA_RESPONSE = 'FILE_DATA_RESPONSE',
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

export interface SharedFileData {
  name: string;
  size?: number;
  type?: string;
  data: string;
}