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
  FILE_INFO_RESPONSE = 'FILE_INFO_RESPONSE',
  FILE_INFO_AND_TRANSFER_REQUEST = 'FILE_INFO_AND_TRANSFER_REQUEST',
  ERROR = 'ERROR',
  // 简化为单一消息类型
  FILE_CHUNK = 'FILE_CHUNK',
  FILE_CHUNK_REQUEST = 'FILE_CHUNK_REQUEST',
  FILE_TRANSFER_CANCEL = 'FILE_TRANSFER_CANCEL',
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

// 分块数据结构 - 扩展版
export interface FileChunk {
  fileId: string;        // 文件唯一标识
  chunkIndex: number;    // 当前块索引
  totalChunks: number;   // 总块数
  data: string;          // base64编码的块数据
  chunkSize: number;     // 当前块大小(字节)
  
  // 合并自 FileTransferInfo 的字段
  fileName?: string;      // 文件名
  fileSize?: number;      // 文件总大小(字节)
  fileType?: string;      // 文件类型
  filePath?: string;      // 文件路径
  
  // 传输状态标志
  isFirst?: boolean;      // 是否为第一个块（替代 FILE_TRANSFER_START）
  isLast?: boolean;       // 是否为最后一个块（替代 FILE_TRANSFER_COMPLETE）
}

// 传输信息保留，但仅作为内部使用，不再作为单独的消息发送
export interface FileTransferInfo {
  fileId: string;        // 文件唯一标识
  fileName: string;      // 文件名
  fileSize: number;      // 文件总大小(字节)
  totalChunks: number;   // 总块数
  chunkSize: number;     // 每块大小(字节)
  fileType: string;      // 文件类型
  filePath: string;      // 文件路径
}

// 文件传输状态枚举
export enum FileTransferStatus {
  INITIALIZING = 'initializing',
  TRANSFERRING = 'transferring',
  ASSEMBLING = 'assembling',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

// 文件传输对象接口
export interface FileTransfer {
  fileId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  progress: number;
  speed: number; // 字节/秒
  status: FileTransferStatus;
  error?: string;
  startTime: number;
  endTime?: number;
}