import { DataConnection } from 'peerjs';
import { MessageType, serializeMessage, SharedFileInfo, FileChunk, FileTransferInfo, FileTransferStatus, FileTransfer } from '@/lib/webrtc';
import { v4 } from 'uuid';
import { ChunkProcessor, BufferedChunkProcessor, StreamChunkProcessor } from './chunk-processors';

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
  resolve: (data: Blob) => void;
  reject: (error: Error) => void;
  path: string;
  stream?: WritableStream<Uint8Array>;
}

export type RequestId = string;

export class ClientRequestManager {
  private pendingFileRequests: Map<RequestId, PendingFileRequest> = new Map();
  private pendingDirectoryRequests: Map<RequestId, PendingDirectoryRequest> = new Map();
  private pendingFileDataRequests: Map<RequestId, PendingFileDataRequest> = new Map();
  private connection: DataConnection | null = null;
  private timeoutDuration: number = 30000; // 30秒默认超时
  
  // 活跃的文件传输处理器
  private activeChunkProcessors: Map<string, ChunkProcessor> = new Map();
  
  // 回调函数
  private onProgressCallback: ((fileId: string, progress: number, speed: number) => void) | null = null;
  private onTransferStatusChange: ((transfer: FileTransfer) => void) | null = null;
  
  constructor(
    connection: DataConnection | null = null, 
    timeoutDuration?: number,
    onProgress?: (fileId: string, progress: number, speed: number) => void,
    onTransferStatusChange?: (transfer: FileTransfer) => void
  ) {
    this.connection = connection;
    if (timeoutDuration) {
      this.timeoutDuration = timeoutDuration;
    }
    this.onProgressCallback = onProgress || null;
    this.onTransferStatusChange = onTransferStatusChange || null;
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

  handleFileDataResponse(requestId: string, payload: Blob) {
    const request = this.pendingFileDataRequests.get(requestId);
    if (request) {
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
    } else if (this.pendingFileDataRequests.has(requestId)) {
      const request = this.pendingFileDataRequests.get(requestId)!;
      request.reject(new Error(errorMessage));
      this.pendingFileDataRequests.delete(requestId);
    }
  }

  // 设置进度回调
  setProgressCallback(callback: (fileId: string, progress: number, speed: number) => void) {
    this.onProgressCallback = callback;
  }

  // 设置传输状态变化回调
  setTransferStatusChangeCallback(callback: (transfer: FileTransfer) => void) {
    this.onTransferStatusChange = callback;
  }

  // 处理文件块消息
  handleFileChunk(chunk: FileChunk, requestId?: string) {
    const fileId = chunk.fileId;
    
    // 如果是第一个块，且带有文件信息，创建处理器
    if (chunk.isFirst && chunk.fileName && chunk.fileSize && !this.activeChunkProcessors.has(fileId)) {
      const request = requestId ? this.pendingFileDataRequests.get(requestId) : null;
      if (!request) {
        console.warn('Received first chunk without active request:', fileId);
        return;
      }
      
      // 创建传输信息
      const transferInfo: FileTransferInfo = {
        fileId,
        fileName: chunk.fileName,
        fileSize: chunk.fileSize,
        totalChunks: chunk.totalChunks,
        chunkSize: chunk.chunkSize,
        fileType: chunk.fileType || '',
        filePath: chunk.filePath || ''
      };
      
      // 创建处理器
      let processor: ChunkProcessor;
      
      if (request.stream) {
        // 使用流式处理器
        try {
          processor = new StreamChunkProcessor(
            fileId,
            transferInfo,
            request.stream,
            this.requestFileChunk.bind(this),
            request.resolve,
            request.reject,
            this.onProgressCallback || undefined,
            this.onTransferStatusChange || undefined
          );
        } catch (error) {
          console.error('Failed to create stream processor, falling back to buffered:', error);
          // 如果创建流处理器失败，回退到缓冲处理器
          processor = new BufferedChunkProcessor(
            fileId,
            transferInfo,
            this.requestFileChunk.bind(this),
            request.resolve,
            request.reject,
            this.onProgressCallback || undefined,
            this.onTransferStatusChange || undefined
          );
        }
      } else {
        // 使用缓冲处理器
        processor = new BufferedChunkProcessor(
          fileId,
          transferInfo,
          this.requestFileChunk.bind(this),
          request.resolve,
          request.reject,
          this.onProgressCallback || undefined,
          this.onTransferStatusChange || undefined
        );
      }
      
      // 保存处理器
      this.activeChunkProcessors.set(fileId, processor);
    }
    
    // 获取处理器
    const processor = this.activeChunkProcessors.get(fileId);
    if (!processor) {
      console.warn('Received chunk for unknown file transfer:', fileId);
      return;
    }
    
    // 处理块
    processor.processChunk(chunk);
    
    // 如果应该完成传输，调用完成方法
    if (processor.shouldComplete(chunk)) {
      this.completeTransfer(fileId);
    }
  }

  // 完成传输
  private async completeTransfer(fileId: string) {
    const processor = this.activeChunkProcessors.get(fileId);
    if (!processor) return;
    
    try {
      await processor.complete();
      // 传输完成后清理处理器
      this.activeChunkProcessors.delete(fileId);
    } catch (error) {
      console.error('Error completing transfer:', error);
      // 不删除处理器，允许重试
    }
  }

  // 请求文件块
  private requestFileChunk(fileId: string, chunkIndex: number, filePath: string) {
    if (!this.connection) return;
    
    const requestId = v4();
    const message = {
      type: MessageType.FILE_CHUNK_REQUEST,
      payload: {
        fileId,
        chunkIndex,
        filePath
      },
      requestId
    };
    
    this.connection.send(serializeMessage(message));
  }

  // 取消文件传输
  cancelFileTransfer(fileId: string) {
    if (!this.connection || !this.activeChunkProcessors.has(fileId)) {
      return;
    }
    
    const processor = this.activeChunkProcessors.get(fileId)!;
    
    // 发送取消消息
    const message = {
      type: MessageType.FILE_TRANSFER_CANCEL,
      payload: {
        fileId
      }
    };
    
    this.connection.send(serializeMessage(message));
    
    // 取消处理
    processor.cancel(new Error('传输已取消'));
    
    // 延迟清理处理器
    setTimeout(() => {
      this.activeChunkProcessors.delete(fileId);
    }, 10000);
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
      payload: { path: filePath },
      requestId
    }));
    
    return requestPromise;
  }

  // 请求文件数据
  async requestFileData(filePath: string, options?: { stream?: WritableStream<Uint8Array> }): Promise<Blob> {
    if (!this.connection) {
      throw new Error('未连接');
    }
    
    // 生成请求ID
    const requestId = v4();
    
    const requestPromise = new Promise<Blob>((resolve, reject) => {
      const pendingRequest = {
        resolve,
        reject,
        path: filePath,
        stream: options?.stream
      };
      
      this.pendingFileDataRequests.set(requestId, pendingRequest);
      
      // 设置超时
      setTimeout(() => {
        if (this.pendingFileDataRequests.has(requestId)) {
          this.pendingFileDataRequests.delete(requestId);
          reject(new Error(`请求文件数据超时: ${filePath}`));
        }
      }, this.timeoutDuration);
    });
    
    // 发送请求
    const message = {
      type: MessageType.FILE_INFO_AND_TRANSFER_REQUEST,
      payload: { path: filePath },
      requestId
    };
    
    this.connection.send(serializeMessage(message));
    
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
      
      // 设置超时
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
      payload: { path },
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
    
    // 拒绝所有未完成的文件数据请求
    for (const [requestId, request] of this.pendingFileDataRequests.entries()) {
      request.reject(new Error(error));
      this.pendingFileDataRequests.delete(requestId);
    }
    
    // 取消所有活跃的传输
    for (const [fileId, processor] of this.activeChunkProcessors.entries()) {
      processor.cancel(new Error(error));
      this.activeChunkProcessors.delete(fileId);
    }
  }

  // 处理 worker 消息
  async workerMessageHandler(path: string, writable: WritableStream<Uint8Array>) {
    try {
      // 使用流式方式请求文件
      await this.requestFileData(path, { stream: writable });
    } catch (error) {
      console.error('Error in worker message handler:', error);
      writable.close();
    }
  }

  // 获取所有活跃传输
  getAllActiveTransfers(): FileTransfer[] {
    return Array.from(this.activeChunkProcessors.values()).map(processor => processor.getTransfer());
  }
}

export default ClientRequestManager; 