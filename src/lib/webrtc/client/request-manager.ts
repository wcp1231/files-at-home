import { DataConnection } from 'peerjs';
import { MessageType, serializeMessage, SharedFileData, SharedFileInfo } from '@/lib/webrtc';
import { v4 } from 'uuid';
// 请求类型
export interface PendingFileRequest {
  resolve: (data: SharedFileInfo | null) => void;
  reject: (error: Error) => void;
  path: string;
}

export interface PendingDirectoryRequest {
  resolve: (data: SharedFileInfo[]) => void;
  reject: (error: Error) => void;
  path: string;
}

export interface PendingFileDataRequest {
  resolve: (data: SharedFileData) => void;
  reject: (error: Error) => void;
  path: string;
}

export type RequestId = string;

export class ClientRequestManager {
  private pendingFileRequests: Map<RequestId, PendingFileRequest> = new Map();
  private pendingDirectoryRequests: Map<RequestId, PendingDirectoryRequest> = new Map();
  private pendingFileDataRequests: Map<RequestId, PendingFileDataRequest> = new Map();
  private connection: DataConnection | null = null;
  private timeoutDuration: number = 30000; // 30秒默认超时
  
  constructor(connection: DataConnection | null = null, timeoutDuration?: number) {
    this.connection = connection;
    if (timeoutDuration) {
      this.timeoutDuration = timeoutDuration;
    }
  }

  setConnection(connection: DataConnection | null) {
    this.connection = connection;
  }

  // 处理接收到的响应
  handleFileInfoResponse(requestId: string, payload: SharedFileInfo | null) {
    if (this.pendingFileRequests.has(requestId)) {
      const request = this.pendingFileRequests.get(requestId)!;
      request.resolve(payload);
      this.pendingFileRequests.delete(requestId);
    }
  }

  handleFileDataResponse(requestId: string, payload: SharedFileData) {
    if (this.pendingFileDataRequests.has(requestId)) {
      const request = this.pendingFileDataRequests.get(requestId)!;
      request.resolve(payload);
      this.pendingFileDataRequests.delete(requestId);
    }
  }

  handleDirectoryResponse(requestId: string, payload: SharedFileInfo[]) {
    if (this.pendingDirectoryRequests.has(requestId)) {
      const request = this.pendingDirectoryRequests.get(requestId)!;
      request.resolve(payload);
      this.pendingDirectoryRequests.delete(requestId);
    }
  }

  handleErrorResponse(requestId: string, errorMessage: string) {
    if (this.pendingFileRequests.has(requestId)) {
      const request = this.pendingFileRequests.get(requestId)!;
      request.reject(new Error(errorMessage));
      this.pendingFileRequests.delete(requestId);
    } else if (this.pendingDirectoryRequests.has(requestId)) {
      const request = this.pendingDirectoryRequests.get(requestId)!;
      request.reject(new Error(errorMessage));
      this.pendingDirectoryRequests.delete(requestId);
    }
  }

  // 发送请求方法
  async requestFile(filePath: string): Promise<SharedFileInfo | null> {
    if (!this.connection) {
      throw new Error('未连接');
    }
    
    const requestId = v4();
    const requestPromise = new Promise<SharedFileInfo | null>((resolve, reject) => {
      const pendingRequest: PendingFileRequest = {
        resolve,
        reject,
        path: filePath
      };
      
      this.pendingFileRequests.set(requestId, pendingRequest);
      
      // 设置超时处理
      setTimeout(() => {
        if (this.pendingFileRequests.has(requestId)) {
          this.pendingFileRequests.delete(requestId);
          reject(new Error('请求超时'));
        }
      }, this.timeoutDuration);
    });
    
    // 发送请求
    this.connection.send(serializeMessage({
      type: MessageType.FILE_INFO_REQUEST,
      payload: filePath,
      requestId
    }));
    
    return requestPromise;
  }

  async requestFileData(filePath: string): Promise<SharedFileData> {
    if (!this.connection) {
      throw new Error('未连接');
    }
    
    const requestId = v4();
    const requestPromise = new Promise<SharedFileData>((resolve, reject) => {
      const pendingRequest: PendingFileDataRequest = {
        resolve,
        reject,
        path: filePath
      };
      
      this.pendingFileDataRequests.set(requestId, pendingRequest);
      
      // 设置超时处理
      setTimeout(() => {
        if (this.pendingFileDataRequests.has(requestId)) {
          this.pendingFileDataRequests.delete(requestId);
          reject(new Error('请求超时'));
        }
      }, this.timeoutDuration);
    });
    
    // 发送请求
    this.connection.send(serializeMessage({
      type: MessageType.FILE_DATA_REQUEST,
      payload: filePath,
      requestId
    }));
    
    return requestPromise;
  }

  async requestDirectory(path: string): Promise<SharedFileInfo[]> {
    if (!this.connection) {
      throw new Error('未连接');
    }
    
    const requestId = v4();
    const requestPromise = new Promise<SharedFileInfo[]>((resolve, reject) => {
      const pendingRequest: PendingDirectoryRequest = {
        resolve,
        reject,
        path
      };
      
      this.pendingDirectoryRequests.set(requestId, pendingRequest);
      
      // 设置超时处理
      setTimeout(() => {
        if (this.pendingDirectoryRequests.has(requestId)) {
          this.pendingDirectoryRequests.delete(requestId);
          reject(new Error('请求超时'));
        }
      }, this.timeoutDuration);
    });
    
    // 发送请求
    this.connection.send(serializeMessage({
      type: MessageType.DIRECTORY_REQUEST,
      payload: path,
      requestId
    }));
    
    return requestPromise;
  }

  // 清理所有挂起的请求
  clearAllRequests(error: string = '连接已关闭') {
    // 拒绝所有未完成的文件请求
    for (const [requestId, request] of this.pendingFileRequests.entries()) {
      request.reject(new Error(error));
      this.pendingFileRequests.delete(requestId);
    }
    
    // 拒绝所有未完成的目录请求
    for (const [requestId, request] of this.pendingDirectoryRequests.entries()) {
      request.reject(new Error(error));
      this.pendingDirectoryRequests.delete(requestId);
    }
  }
}

export default ClientRequestManager; 