import { 
  MessageType, 
  FileUploadRequest, 
  FileUploadResponse, 
  FileUploadChunk,
  FileUploadComplete, 
  FileUploadCancel,
  FileTransferStatus,
  WebRTCMessage
} from '../types';
import { EnhancedConnection } from './enhanced-connection';
import { MessageHandlerCallback, ClientMessageHandler } from './message-handler';
import { v4 as uuidv4 } from 'uuid';

// 上传状态回调接口
export interface UploadStatusCallback {
  onUploadStart?: (uploadId: string, fileName: string, fileSize: number) => void;
  onUploadProgress?: (uploadId: string, progress: number, speed: number) => void;
  onUploadComplete?: (uploadId: string, fileName: string, fileSize: number) => void;
  onUploadError?: (uploadId: string, error: string) => void;
  onUploadCancel?: (uploadId: string) => void;
}

// 上传选项接口
export interface UploadOptions {
  chunkSize?: number;
  concurrentUploads?: number;
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  callbacks?: UploadStatusCallback;
}

// 默认选项
const DEFAULT_OPTIONS: Required<UploadOptions> = {
  chunkSize: 512 * 1024, // 512KB 每块
  concurrentUploads: 3,  // 同时上传3块
  retries: 3,            // 重试3次
  retryDelay: 1000,      // 1秒后重试
  timeout: 30000,        // 30秒超时
  metadata: {},
  callbacks: {}
};

// 上传状态
interface UploadState {
  id: string;
  file: File;
  options: Required<UploadOptions>;
  pendingChunks: number[];
  processingChunks: Set<number>;
  completedChunks: Set<number>;
  failedChunks: Map<number, number>; // 块索引 -> 重试计数
  totalChunks: number;
  startTime: number;
  lastProgressTime: number;
  bytesUploaded: number;
  bytesTotal: number;
  status: FileTransferStatus;
  error?: string;
  aborted: boolean;
}

/**
 * 客户端文件上传管理器
 */
export class ClientUploadManager {
  private connection: EnhancedConnection;
  private defaultOptions: Required<UploadOptions>;
  private activeUploads: Map<string, UploadState> = new Map();
  private pendingResponses: Map<string, (response: FileUploadResponse) => void> = new Map();
  
  // 消息处理回调函数
  private uploadResponseHandler: MessageHandlerCallback;
  private uploadCompleteHandler: MessageHandlerCallback;
  private errorHandler: MessageHandlerCallback;
  private messageHandler: ClientMessageHandler;
  
  /**
   * 创建上传管理器
   * @param connection WebRTC增强连接
   * @param options 全局默认选项
   */
  constructor(
    connection: EnhancedConnection,
    options?: UploadOptions
  ) {
    this.connection = connection;
    this.defaultOptions = {
      ...DEFAULT_OPTIONS,
      ...options
    };

    this.messageHandler = connection.getMessageHandler()!;
    
    // 创建消息处理函数
    this.uploadResponseHandler = this.handleUploadResponse.bind(this);
    this.uploadCompleteHandler = this.handleUploadComplete.bind(this);
    this.errorHandler = this.handleError.bind(this);
    
    // 添加消息处理器
    this.setupMessageHandlers();
  }
  
  /**
   * 设置消息处理函数
   */
  private setupMessageHandlers() {
    this.messageHandler.registerMessageHandler(MessageType.FILE_UPLOAD_RESPONSE, this.uploadResponseHandler);
    this.messageHandler.registerMessageHandler(MessageType.FILE_UPLOAD_COMPLETE, this.uploadCompleteHandler);
    this.messageHandler.registerMessageHandler(MessageType.ERROR, this.errorHandler);
  }
  
  /**
   * 清理消息处理函数
   */
  private cleanupMessageHandlers() {
    this.messageHandler.unregisterMessageHandler(MessageType.FILE_UPLOAD_RESPONSE, this.uploadResponseHandler);
    this.messageHandler.unregisterMessageHandler(MessageType.FILE_UPLOAD_COMPLETE, this.uploadCompleteHandler);
    this.messageHandler.unregisterMessageHandler(MessageType.ERROR, this.errorHandler);
  }
  
  /**
   * 处理上传响应
   * @param requestId 请求ID
   * @param payload 响应数据
   */
  private handleUploadResponse(requestId: string, payload: FileUploadResponse) {
    // 处理响应回调
    const callback = this.pendingResponses.get(requestId);
    if (callback) {
      callback(payload);
      this.pendingResponses.delete(requestId);
    }
    
    // 如果是指定的上传ID的响应，还需要处理上传状态
    const uploadId = payload.uploadId;
    const uploadState = this.activeUploads.get(uploadId);
    
    if (uploadState && !payload.ready) {
      // 如果服务器表示不准备好，处理错误
      if (payload.error) {
        this.handleUploadError(uploadId, new Error(payload.error));
      }
    }
  }
  
  /**
   * 处理上传完成消息
   * @param requestId 请求ID
   * @param payload 完成消息数据
   */
  private handleUploadComplete(requestId: string, payload: FileUploadComplete) {
    const { uploadId, success, error } = payload;
    const uploadState = this.activeUploads.get(uploadId);
    
    if (!uploadState) return;
    
    if (success) {
      // 上传成功
      uploadState.status = FileTransferStatus.COMPLETED;
      uploadState.bytesUploaded = uploadState.bytesTotal;
      
      // 调用完成回调
      if (uploadState.options.callbacks.onUploadComplete) {
        uploadState.options.callbacks.onUploadComplete(
          uploadId,
          uploadState.file.name,
          uploadState.file.size
        );
      }
      
      // 清理资源
      this.cleanupUpload(uploadId);
    } else {
      // 上传失败
      this.handleUploadError(uploadId, new Error(error || '上传失败'));
    }
  }
  
  /**
   * 处理错误消息
   * @param requestId 请求ID
   * @param payload 错误数据
   */
  private handleError(requestId: string, payload: { error: string }) {
    // 检查是否与任何上传相关
    for (const [uploadId, state] of this.activeUploads.entries()) {
      if (state.pendingChunks.length > 0 || state.processingChunks.size > 0) {
        // 可能是与这个上传相关的错误，重新安排未完成的块
        this.rescheduleFailedChunks(uploadId);
      }
    }
    
    // 处理任何等待这个请求ID的响应
    const callback = this.pendingResponses.get(requestId);
    if (callback) {
      callback({
        uploadId: '',
        ready: false,
        error: payload.error
      });
      this.pendingResponses.delete(requestId);
    }
  }
  
  /**
   * 上传文件到主机
   * @param file 要上传的文件
   * @param options 上传选项
   * @returns 上传ID
   */
  async uploadFile(file: File, options?: UploadOptions): Promise<string> {
    // 合并选项
    const mergedOptions: Required<UploadOptions> = {
      ...this.defaultOptions,
      ...options
    };
    
    // 计算块数
    const totalChunks = Math.ceil(file.size / mergedOptions.chunkSize);
    
    // 创建上传请求
    const uploadRequest: FileUploadRequest = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      totalChunks,
      chunkSize: mergedOptions.chunkSize,
      metadata: mergedOptions.metadata
    };
    
    // 发送初始化请求
    const response = await this.sendUploadRequest(uploadRequest);
    
    if (!response.ready || !response.uploadId) {
      throw new Error(response.error || '上传初始化失败');
    }
    
    const uploadId = response.uploadId;
    
    // 创建上传状态
    const uploadState: UploadState = {
      id: uploadId,
      file,
      options: mergedOptions,
      pendingChunks: Array.from({ length: totalChunks }, (_, i) => i), // 所有块的索引
      processingChunks: new Set<number>(),
      completedChunks: new Set<number>(),
      failedChunks: new Map<number, number>(),
      totalChunks,
      startTime: Date.now(),
      lastProgressTime: Date.now(),
      bytesUploaded: 0,
      bytesTotal: file.size,
      status: FileTransferStatus.INITIALIZING,
      aborted: false
    };
    
    // 保存上传状态
    this.activeUploads.set(uploadId, uploadState);
    
    // 调用开始回调
    if (mergedOptions.callbacks.onUploadStart) {
      mergedOptions.callbacks.onUploadStart(uploadId, file.name, file.size);
    }
    
    // 更新状态并开始上传
    uploadState.status = FileTransferStatus.TRANSFERRING;
    this.processNextChunks(uploadId);
    
    return uploadId;
  }
  
  /**
   * 处理下一批块
   * @param uploadId 上传ID
   */
  private processNextChunks(uploadId: string) {
    const uploadState = this.activeUploads.get(uploadId);
    if (!uploadState || uploadState.aborted) return;
    
    // 如果所有块都已经完成，则完成上传
    if (
      uploadState.pendingChunks.length === 0 && 
      uploadState.processingChunks.size === 0 &&
      uploadState.completedChunks.size === uploadState.totalChunks
    ) {
      this.finalizeUpload(uploadId);
      return;
    }
    
    // 计算可以并行处理的块数
    const availableSlots = uploadState.options.concurrentUploads - uploadState.processingChunks.size;
    
    // 如果没有可用槽位，等待当前批次完成
    if (availableSlots <= 0) return;
    
    // 选择要处理的块
    const chunksToProcess = uploadState.pendingChunks.slice(0, availableSlots);
    
    // 从待处理列表中移除这些块
    uploadState.pendingChunks = uploadState.pendingChunks.slice(availableSlots);
    
    // 标记为正在处理
    chunksToProcess.forEach(chunkIndex => {
      uploadState.processingChunks.add(chunkIndex);
      
      // 异步处理块
      this.processChunk(uploadId, chunkIndex).catch(error => {
        console.error(`处理块 ${chunkIndex} 时出错:`, error);
        this.handleChunkError(uploadId, chunkIndex, error);
      });
    });
  }
  
  /**
   * 处理单个块
   * @param uploadId 上传ID
   * @param chunkIndex 块索引
   */
  private async processChunk(uploadId: string, chunkIndex: number): Promise<void> {
    const uploadState = this.activeUploads.get(uploadId);
    if (!uploadState || uploadState.aborted) return;
    
    try {
      // 获取块数据
      const start = chunkIndex * uploadState.options.chunkSize;
      const end = Math.min(start + uploadState.options.chunkSize, uploadState.file.size);
      const chunkData = uploadState.file.slice(start, end);
      
      // 转为base64
      const arrayBuffer = await chunkData.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      
      // 判断是否是最后一个块
      const isLast = chunkIndex === uploadState.totalChunks - 1;
      
      // 创建块数据
      const chunkPayload: FileUploadChunk = {
        uploadId,
        chunkIndex,
        data: base64Data,
        isLast
      };
      
      // 发送块
      await this.sendChunk(chunkPayload);
      
      // 标记为已完成
      uploadState.processingChunks.delete(chunkIndex);
      uploadState.completedChunks.add(chunkIndex);
      
      // 更新进度
      const chunkSize = end - start;
      uploadState.bytesUploaded += chunkSize;
      this.updateProgress(uploadId);
      
      // 继续处理下一批
      this.processNextChunks(uploadId);
    } catch (error) {
      this.handleChunkError(uploadId, chunkIndex, error as Error);
    }
  }
  
  /**
   * 处理块上传错误
   * @param uploadId 上传ID
   * @param chunkIndex 块索引
   * @param error 错误信息
   */
  private handleChunkError(uploadId: string, chunkIndex: number, error: Error): void {
    const uploadState = this.activeUploads.get(uploadId);
    if (!uploadState || uploadState.aborted) return;
    
    // 从处理中移除
    uploadState.processingChunks.delete(chunkIndex);
    
    // 增加失败计数
    const retryCount = (uploadState.failedChunks.get(chunkIndex) || 0) + 1;
    uploadState.failedChunks.set(chunkIndex, retryCount);
    
    // 检查是否超过最大重试次数
    if (retryCount <= uploadState.options.retries) {
      // 重新添加到待处理队列
      uploadState.pendingChunks.push(chunkIndex);
      
      // 添加延迟后重试
      setTimeout(() => {
        if (this.activeUploads.has(uploadId) && !uploadState.aborted) {
          this.processNextChunks(uploadId);
        }
      }, uploadState.options.retryDelay);
    } else {
      // 超过最大重试次数，整个上传失败
      this.handleUploadError(uploadId, new Error(`块 ${chunkIndex} 上传失败: ${error.message}`));
    }
  }
  
  /**
   * 处理上传错误
   * @param uploadId 上传ID
   * @param error 错误信息
   */
  private handleUploadError(uploadId: string, error: Error): void {
    const uploadState = this.activeUploads.get(uploadId);
    if (!uploadState) return;
    
    uploadState.status = FileTransferStatus.ERROR;
    uploadState.error = error.message;
    
    // 调用错误回调
    if (uploadState.options.callbacks.onUploadError) {
      uploadState.options.callbacks.onUploadError(uploadId, error.message);
    }
    
    // 清理资源
    this.cleanupUpload(uploadId);
  }
  
  /**
   * 更新上传进度
   * @param uploadId 上传ID
   */
  private updateProgress(uploadId: string): void {
    const uploadState = this.activeUploads.get(uploadId);
    if (!uploadState) return;
    
    const now = Date.now();
    const progress = uploadState.bytesUploaded / uploadState.bytesTotal;
    
    // 计算当前速度（每秒字节数）
    const timeDiff = now - uploadState.lastProgressTime;
    let speed = 0;
    
    if (timeDiff > 0) {
      const bytesInInterval = uploadState.bytesUploaded / uploadState.bytesTotal * uploadState.file.size;
      speed = (bytesInInterval / timeDiff) * 1000; // 字节/秒
      uploadState.lastProgressTime = now;
    }
    
    // 调用进度回调
    if (uploadState.options.callbacks.onUploadProgress) {
      uploadState.options.callbacks.onUploadProgress(uploadId, progress, speed);
    }
  }
  
  /**
   * 重新安排失败的块
   * @param uploadId 上传ID
   */
  private rescheduleFailedChunks(uploadId: string): void {
    const uploadState = this.activeUploads.get(uploadId);
    if (!uploadState || uploadState.aborted) return;
    
    // 将正在处理的块重新添加到待处理队列
    const processingChunks = Array.from(uploadState.processingChunks);
    processingChunks.forEach(chunkIndex => {
      uploadState.processingChunks.delete(chunkIndex);
      uploadState.pendingChunks.push(chunkIndex);
    });
    
    // 继续处理
    setTimeout(() => {
      this.processNextChunks(uploadId);
    }, uploadState.options.retryDelay);
  }
  
  /**
   * 完成上传
   * @param uploadId 上传ID
   */
  private async finalizeUpload(uploadId: string): Promise<void> {
    const uploadState = this.activeUploads.get(uploadId);
    if (!uploadState) return;
    
    // 更新状态
    uploadState.status = FileTransferStatus.ASSEMBLING;
  }
  
  /**
   * 取消上传
   * @param uploadId 上传ID
   */
  async cancelUpload(uploadId: string): Promise<void> {
    const uploadState = this.activeUploads.get(uploadId);
    if (!uploadState) {
      throw new Error(`找不到上传ID: ${uploadId}`);
    }
    
    // 标记为已取消
    uploadState.aborted = true;
    uploadState.status = FileTransferStatus.CANCELLED;
    
    // 创建取消消息
    const cancelPayload: FileUploadCancel = {
      uploadId,
      reason: '用户取消'
    };
    
    try {
      // 发送取消消息
      const requestId = uuidv4();
      const message: WebRTCMessage = {
        type: MessageType.FILE_UPLOAD_CANCEL,
        payload: cancelPayload,
        requestId
      };
      
      this.connection.sendRequest(message);
      
      // 调用取消回调
      if (uploadState.options.callbacks.onUploadCancel) {
        uploadState.options.callbacks.onUploadCancel(uploadId);
      }
      
      // 清理资源
      this.cleanupUpload(uploadId);
      
    } catch (error) {
      console.error('取消上传时出错:', error);
    }
  }
  
  /**
   * 清理上传资源
   * @param uploadId 上传ID
   */
  private cleanupUpload(uploadId: string): void {
    // 移除上传状态
    this.activeUploads.delete(uploadId);
  }
  
  /**
   * 获取上传状态
   * @param uploadId 上传ID
   */
  getUploadStatus(uploadId: string): {
    status: FileTransferStatus;
    progress: number;
    file?: File;
    error?: string;
  } | null {
    const uploadState = this.activeUploads.get(uploadId);
    if (!uploadState) return null;
    
    return {
      status: uploadState.status,
      progress: uploadState.bytesUploaded / uploadState.bytesTotal,
      file: uploadState.file,
      error: uploadState.error
    };
  }
  
  /**
   * 发送上传请求
   * @param payload 请求数据
   * @returns 响应
   */
  private async sendUploadRequest(payload: FileUploadRequest): Promise<FileUploadResponse> {
    const requestId = uuidv4();
    
    return new Promise<FileUploadResponse>((resolve, reject) => {
      // 设置超时
      const timeoutId = setTimeout(() => {
        this.pendingResponses.delete(requestId);
        reject(new Error('上传请求超时'));
      }, this.defaultOptions.timeout);
      
      // 保存回调
      this.pendingResponses.set(requestId, (response) => {
        clearTimeout(timeoutId);
        resolve(response);
      });
      
      // 发送请求
      const message: WebRTCMessage = {
        type: MessageType.FILE_UPLOAD_REQUEST,
        payload,
        requestId
      };
      
      this.connection.sendRequest(message).catch(error => {
        clearTimeout(timeoutId);
        this.pendingResponses.delete(requestId);
        reject(error);
      });
    });
  }
  
  /**
   * 发送块数据
   * @param payload 块数据
   * @returns 响应
   */
  private async sendChunk(payload: FileUploadChunk): Promise<FileUploadResponse> {
    const requestId = uuidv4();
    
    return new Promise<FileUploadResponse>((resolve, reject) => {
      // 设置超时
      const timeoutId = setTimeout(() => {
        this.pendingResponses.delete(requestId);
        reject(new Error('发送块超时'));
      }, this.defaultOptions.timeout);
      
      // 保存回调
      this.pendingResponses.set(requestId, (response) => {
        clearTimeout(timeoutId);
        resolve(response);
      });
      
      // 发送块
      const message: WebRTCMessage = {
        type: MessageType.FILE_UPLOAD_CHUNK,
        payload,
        requestId
      };
      
      this.connection.sendRequest(message).catch(error => {
        clearTimeout(timeoutId);
        this.pendingResponses.delete(requestId);
        reject(error);
      });
    });
  }
  
  /**
   * 释放资源
   */
  dispose(): void {
    // 取消所有上传
    for (const uploadId of this.activeUploads.keys()) {
      this.cancelUpload(uploadId).catch(err => {
        console.error(`取消上传 ${uploadId} 时出错:`, err);
      });
    }
    
    // 清理所有消息处理器
    this.cleanupMessageHandlers();
  }
}
