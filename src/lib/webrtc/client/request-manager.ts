import { DataConnection } from 'peerjs';
import { MessageType, SharedFileInfo, FileTransferInfo, FileTransfer, FileTransferResponse, DirectoryResponse, FileInfoResponse, FileChunkResponse, ErrorResponse, WebRTCMessage } from '@/lib/webrtc';
import { v4 } from 'uuid';
import { ChunkProcessor, BufferedChunkProcessor, StreamChunkProcessor } from './chunk-processors';
import { ClientMessageHandler } from './message-handler';
import { ConnectionPhase } from './connection';
import { WorkerManager } from './worker';
import { WorkerWritableStream } from './worker-writable-stream';

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

export interface PendingFileTransferRequest {
  resolve: (data: Blob) => void;
  reject: (error: Error) => void;
  path: string;
  stream?: WritableStream<Uint8Array>;
  receiveChunkAt: number;
  // 分块请求范围
  start?: number;
  end?: number;
}

export interface PendingFileChunkRequest {
  resolve: (data: FileChunkResponse) => void;
  reject: (error: Error) => void;
  path: string;
}

export type RequestId = string;

export class ClientRequestManager {
  private messageHandler?: ClientMessageHandler;
  private pendingFileRequests: Map<RequestId, PendingFileRequest> = new Map();
  private pendingDirectoryRequests: Map<RequestId, PendingDirectoryRequest> = new Map();
  private pendingFileChunkRequests: Map<RequestId, PendingFileChunkRequest> = new Map();
  private pendingFileTransferRequests: Map<RequestId, PendingFileTransferRequest> = new Map();
  private connection: DataConnection | null = null;
  private timeoutDuration: number = 30000; // 30秒默认超时
  
  // 活跃的文件传输处理器
  private activeChunkProcessors: Map<string, ChunkProcessor> = new Map();
  
  // 回调函数
  private onProgressCallback: ((fileId: string, progress: number, speed: number) => void) | null = null;
  private onTransferStatusChange: ((transfer: FileTransfer) => void) | null = null;

  // 当前连接阶段
  private currentPhase: ConnectionPhase = ConnectionPhase.DISCONNECTED;
  
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

    // 设置 worker 消息处理器
    WorkerManager.setMessageHandler(this.workerMessageHandler.bind(this));
  }

  setMessageHandler(messageHandler: ClientMessageHandler) {
    this.messageHandler = messageHandler;
  }

  setConnection(connection: DataConnection | null) {
    this.connection = connection;
  }

  // Set the current connection phase
  setPhase(phase: ConnectionPhase) {
    this.currentPhase = phase;
    
    // If transitioning to disconnected, clear all requests
    if (phase === ConnectionPhase.DISCONNECTED) {
      this.clearAllRequests('连接已关闭');
    }
  }

  // 处理接收到的响应
  handleFileInfoResponse(requestId: string, payload: FileInfoResponse) {
    if (this.pendingFileRequests.has(requestId)) {
      const request = this.pendingFileRequests.get(requestId)!;
      request.resolve(payload.file);
      this.pendingFileRequests.delete(requestId);
    }
  }

  handleFileTransferResponse(requestId: string, payload: FileTransferResponse) {
    // Only process in active phase
    if (this.currentPhase !== ConnectionPhase.ACTIVE) {
      console.warn('Received file transfer response while not in ACTIVE phase');
      return;
    }
    
    const request = this.pendingFileTransferRequests.get(requestId);
    if (!request) {
      console.warn('Received file transfer response without active request:', requestId);
      return;
    }
    this.startTransfer(requestId, payload, request);
  }

  handleFileChunkResponse(requestId: string, payload: FileChunkResponse) {
    // Only process in active phase
    if (this.currentPhase !== ConnectionPhase.ACTIVE) {
      console.warn('Received file chunk response while not in ACTIVE phase');
      return;
    }
    
    const request = this.pendingFileChunkRequests.get(requestId);
    if (request) {
      request.resolve(payload);
      this.pendingFileChunkRequests.delete(requestId);
    }
  }

  handleDirectoryResponse(requestId: string, payload: DirectoryResponse) {
    // Only process in active phase
    if (this.currentPhase !== ConnectionPhase.ACTIVE) {
      console.warn('Received directory response while not in ACTIVE phase');
      return;
    }
    
    if (this.pendingDirectoryRequests.has(requestId)) {
      const request = this.pendingDirectoryRequests.get(requestId)!;
      request.resolve(payload.files);
      this.pendingDirectoryRequests.delete(requestId);
    }
  }

  handleErrorResponse(requestId: string, payload: ErrorResponse) {
    if (this.pendingFileRequests.has(requestId)) {
      const request = this.pendingFileRequests.get(requestId)!;
      request.reject(new Error(payload.error));
      this.pendingFileRequests.delete(requestId);
    } else if (this.pendingDirectoryRequests.has(requestId)) {
      const request = this.pendingDirectoryRequests.get(requestId)!;
      request.reject(new Error(payload.error));
      this.pendingDirectoryRequests.delete(requestId);
    } else if (this.pendingFileChunkRequests.has(requestId)) {
      const request = this.pendingFileChunkRequests.get(requestId)!;
      request.reject(new Error(payload.error));
      this.pendingFileChunkRequests.delete(requestId);
    } else if (this.pendingFileTransferRequests.has(requestId)) {
      const request = this.pendingFileTransferRequests.get(requestId)!;
      request.reject(new Error(payload.error));
      this.pendingFileTransferRequests.delete(requestId);
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

  // 取消文件传输
  cancelFileTransfer(fileId: string) {
    if (!this.connection || !this.activeChunkProcessors.has(fileId)) {
      return;
    }
    
    const processor = this.activeChunkProcessors.get(fileId)!;
    
    // 发送取消消息
    const message: WebRTCMessage = {
      type: MessageType.FILE_TRANSFER_CANCEL,
      payload: {
        fileId
      }
    };
    
    this.messageHandler!.sendRequest(this.connection!, message);
    
    // 取消处理
    processor.cancel(new Error('传输已取消'));
    
    // 延迟清理处理器
    setTimeout(() => {
      this.activeChunkProcessors.delete(fileId);
    }, 10000);
  }

  // 发送请求方法
  async requestFile(filePath: string): Promise<SharedFileInfo | null> {
    // Ensure we're in active phase
    this.checkActivePhase('requestFile');
    
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
    this.messageHandler!.sendRequest(this.connection!, {
      type: MessageType.FILE_INFO_REQUEST,
      payload: { path: filePath },
      requestId
    });
    
    return requestPromise;
  }

  // 请求文件数据
  async requestFileData(filePath: string, options?: { stream?: WritableStream<Uint8Array>, start?: number, end?: number }): Promise<Blob> {
    // Ensure we're in active phase
    this.checkActivePhase('requestFileData');
    
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
        stream: options?.stream,
        start: options?.start,
        end: options?.end,
        receiveChunkAt: 0
      };
      this.pendingFileTransferRequests.set(requestId, pendingRequest);
      // 设置超时
      setTimeout(() => {
        this.checkTimeout(requestId);
      }, this.timeoutDuration);
    });
    
    // 发送请求
    const message: WebRTCMessage = {
      type: MessageType.FILE_TRANSFER_REQUEST,
      payload: { path: filePath, start: options?.start, end: options?.end },
      requestId
    };
    
    this.messageHandler!.sendRequest(this.connection!, message);
    
    return requestPromise;
  }

  async requestDirectory(path: string): Promise<SharedFileInfo[]> {
    // Ensure we're in active phase
    this.checkActivePhase('requestDirectory');
    
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
    this.messageHandler!.sendRequest(this.connection!, {
      type: MessageType.DIRECTORY_REQUEST,
      payload: { path },
      requestId
    });
    
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
    for (const [requestId, request] of this.pendingFileTransferRequests.entries()) {
      request.reject(new Error(error));
      this.pendingFileTransferRequests.delete(requestId);
    }

    // 拒绝所有未完成的文件块请求
    for (const [requestId, request] of this.pendingFileChunkRequests.entries()) {
      request.reject(new Error(error));
      this.pendingFileChunkRequests.delete(requestId);
    }
    
    // 取消所有活跃的传输
    for (const [fileId, processor] of this.activeChunkProcessors.entries()) {
      processor.cancel(new Error(error));
      this.activeChunkProcessors.delete(fileId);
    }
  }

  // 处理 worker 消息
  async workerMessageHandler(fileId: string, path: string, writable: WritableStream<Uint8Array>, start?: number, end?: number) {
    try {
      // Ensure we're in active phase
      this.checkActivePhase('workerMessageHandler');
      
      // 如果 writable 为空，则创建一个新的 WorkerWritableStream
      // 兼容苹果系统的 safari 浏览器
      let stream = writable;
      if (!stream) {
        stream = new WorkerWritableStream(fileId);
      }

      // 使用流式方式请求文件
      await this.requestFileData(path, { stream, start, end });
    } catch (error) {
      console.error('Error in worker message handler:', error);
      writable.close();
    }
  }

  // 获取所有活跃传输
  getAllActiveTransfers(): FileTransfer[] {
    return Array.from(this.activeChunkProcessors.values()).map(processor => processor.getTransfer());
  }

  // Helper method to check if we're in active phase
  private checkActivePhase(methodName: string) {
    if (this.currentPhase !== ConnectionPhase.ACTIVE) {
      const error = `Cannot call ${methodName} while not in ACTIVE phase (current phase: ${ConnectionPhase[this.currentPhase]})`;
      throw new Error(error);
    }
  }

  // 开始传输逻辑，创建 chunk 处理器
  private startTransfer(requestId: string, transferResponse: FileTransferResponse, request: PendingFileTransferRequest) {
    const fileId = transferResponse.fileId;
    // 创建 chunk 处理器
    const processor = this.createChunkProcessor(transferResponse, requestId, request);
    if (!processor) {
      console.warn('Failed to create chunk processor:', fileId);
      return;
    }
    // 保存处理器
    this.activeChunkProcessors.set(fileId, processor);

    const chunkRequestPromise = new Promise<FileChunkResponse>((resolve, reject) => {
      const pendingRequest: PendingFileChunkRequest = {
        resolve,
        reject,
        path: transferResponse.path,
      };
      
      this.pendingFileChunkRequests.set(requestId, pendingRequest);
    });
    chunkRequestPromise.then((chunk) => {
      this.handleFileChunk(chunk, requestId);
    });
  }
  

  private createChunkProcessor(transferResponse: FileTransferResponse, requestId: string, request: PendingFileTransferRequest) {
    const fileId = transferResponse.fileId;

    // 创建传输信息
    const transferInfo: FileTransferInfo = {
      requestId: requestId!,
      fileId,
      name: transferResponse.name,
      size: transferResponse.size,
      totalChunks: transferResponse.totalChunks,
      chunkSize: transferResponse.chunkSize,
      type: transferResponse.type,
      path: transferResponse.path,
      start: transferResponse.start,
      end: transferResponse.end
    };
    
    // 创建处理器
    let processor: ChunkProcessor;
    
    if (request.stream) {
      // 使用流式处理器
      try {
        processor = new StreamChunkProcessor(
          requestId!,
          fileId,
          transferInfo,
          request.stream,
          this.requestFileChunk.bind(this),
          request.resolve,
          request.reject,
          this.onProgressCallback || undefined,
          this.onTransferStatusChange || undefined,
          this.onProcessorError.bind(this, fileId)
        );
        return processor;
      } catch (error) {
        console.error('Failed to create stream processor, falling back to buffered:', error);
      }
    }
    // 如果创建流处理器失败，或者不是使用流式处理器，则使用缓冲处理器
    processor = new BufferedChunkProcessor(
      requestId!,
      fileId,
      transferInfo,
      this.requestFileChunk.bind(this),
      request.resolve,
      request.reject,
      this.onProgressCallback || undefined,
      this.onTransferStatusChange || undefined,
      this.onProcessorError.bind(this, fileId)
    );
    return processor;
  }

  // 请求文件块
  private requestFileChunk(fileId: string, chunkIndex: number, filePath: string, start: number, end: number) {
    if (!this.connection) return;

    const requestId = v4();
    const requestPromise = new Promise<FileChunkResponse>((resolve, reject) => {
      const pendingRequest: PendingFileChunkRequest = {
        resolve,
        reject,
        path: filePath,
      };
      
      this.pendingFileChunkRequests.set(requestId, pendingRequest);
      
      // 设置超时
      setTimeout(() => {
        if (this.pendingFileChunkRequests.has(requestId)) {
          this.pendingFileChunkRequests.delete(requestId);
          reject(new Error('请求超时'));
        }
      }, this.timeoutDuration);
    });

    const request: WebRTCMessage = {
      type: MessageType.FILE_CHUNK_REQUEST,
      payload: {
        fileId,
        chunkIndex,
        filePath,
        start,
        end,
      },
      requestId,
    }

    this.messageHandler!.sendRequest(this.connection!, request);
    
    requestPromise.then((chunk) => {
      this.handleFileChunk(chunk, requestId);
    });
  }

  // 处理文件块消息
  private async handleFileChunk(chunk: FileChunkResponse, requestId: string) {
    const fileId = chunk.fileId;
    
    // 获取处理器
    const processor = this.activeChunkProcessors.get(fileId);
    if (!processor) {
      console.warn('Received chunk for unknown file transfer:', fileId);
      return;
    }
    
    // 处理块
    await processor.processChunk(chunk);

    this.updateReceiveChunkAt(requestId);
    
    // 如果应该完成传输，调用完成方法
    if (processor.shouldComplete(chunk)) {
      await this.completeTransfer(fileId, requestId);
    }
  }

  // 完成传输
  private async completeTransfer(fileId: string, requestId: string) {
    const processor = this.activeChunkProcessors.get(fileId);
    if (!processor) return;
    
    try {
      await processor.complete();
      // 传输完成后清理处理器
      this.activeChunkProcessors.delete(fileId);
      this.pendingFileTransferRequests.delete(requestId);
    } catch (error) {
      console.error('Error completing transfer:', error);
      // 不删除处理器，允许重试
    }
  }

  private onProcessorError(fileId: string, error: Error) {
    console.error('processor error:', error);
    this.cancelFileTransfer(fileId);
  }

  // 更新最后一次处理块的时间
  private updateReceiveChunkAt(requestId: string) {
    const request = this.pendingFileTransferRequests.get(requestId);
    if (request) {
      request.receiveChunkAt = Date.now();
    }
  }

  private checkTimeout(requestId: string) {
    const request = this.pendingFileTransferRequests.get(requestId);
    if (!request) return;
    if (Date.now() - request.receiveChunkAt > this.timeoutDuration) {
      this.pendingFileTransferRequests.delete(requestId);
      return
    }
    setTimeout(() => {
      this.checkTimeout(requestId);
    }, this.timeoutDuration);
  }
}
export default ClientRequestManager; 