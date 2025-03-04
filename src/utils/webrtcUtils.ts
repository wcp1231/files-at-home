import { FSDirectory } from '@/store/fileSystemStore';
import { FSEntry } from '@/store/fileSystemStore';
import { Peer, DataConnection } from 'peerjs';

// 添加 FileSystem API 的类型声明
declare global {
  interface FileSystemDirectoryHandle {
    entries(): AsyncIterable<[string, FileSystemHandle]>;
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  }
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

// 创建一个 PeerJS 连接
export function createPeer(id?: string): Peer {
  const options = {
    debug: 2, // 0 = 禁用日志, 1 = 仅错误, 2 = 警告 + 错误, 3 = 全部日志
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' }
      ]
    }
  };
  
  // 如果提供了 ID，则使用它，否则生成随机 ID
  return id ? new Peer(id, options) : new Peer(options);
}

// 序列化消息
export function serializeMessage(message: WebRTCMessage): string {
  return JSON.stringify(message);
}

// 反序列化消息
export function deserializeMessage(data: string): WebRTCMessage {
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to parse message:', error);
    return {
      type: MessageType.ERROR,
      payload: 'Invalid message format',
    };
  }
}

// 将 FileSystemHandle 转换为可共享的文件信息
export async function handleToSharedFileInfo(
  file: FSEntry
): Promise<SharedFileInfo> {
  const isDirectory = file instanceof FSDirectory;
  const fileInfo: SharedFileInfo = {
    name: file.name,
    path: file.path,
    isDirectory,
  };

  if (!isDirectory) {
    fileInfo.size = file.size;
    fileInfo.type = file.type;
    fileInfo.modifiedAt = file.modifiedAt?.toISOString() || new Date().toISOString();
  }

  return fileInfo;
}

// 将文件内容转换为 ArrayBuffer
export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// 将 ArrayBuffer 分块
export function chunkArrayBuffer(buffer: ArrayBuffer, chunkSize: number = 16384): ArrayBuffer[] {
  const chunks: ArrayBuffer[] = [];
  const totalChunks = Math.ceil(buffer.byteLength / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, buffer.byteLength);
    chunks.push(buffer.slice(start, end));
  }
  
  return chunks;
}

// 发送数据到对等连接
export function sendData(conn: DataConnection, message: WebRTCMessage): void {
  conn.send(serializeMessage(message));
} 