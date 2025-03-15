import { FSEntry, FSDirectory } from "@/lib/filesystem";
import { MessageType, SharedFileInfo, WebRTCMessage } from "./types";
import { Peer } from "peerjs";
import { toast } from "@/hooks/use-toast";

// 序列化消息
export function serializeMessage(message: WebRTCMessage): string {
  return JSON.stringify(message);
}

// 反序列化消息
export function deserializeMessage(data: string): WebRTCMessage {
  try {
    return JSON.parse(data);
  } catch (error) {
    toast({
      title: '无法解析消息',
      description: error instanceof Error ? error.message : String(error),
    });
    return {
      type: MessageType.ERROR,
      payload: { error: 'Invalid message format' },
    };
  }
}

// 将 FileSystemHandle 转换为可共享的文件信息
export function handleToSharedFileInfo(
  file: FSEntry
): SharedFileInfo {
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
