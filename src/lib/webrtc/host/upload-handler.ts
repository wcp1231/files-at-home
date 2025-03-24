import { MessageType, FileUploadRequest, FileUploadResponse, FileUploadChunk, FileUploadCancel, WebRTCMessage, FileTransferStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { IndexedDBFileStorage } from '@/utils/IndexedDBFileStorage';
import { HostMessageHandler } from './message-handler';
import { useWebRTCHostStore } from '@/store/webrtcHostStore';

/**
 * 上传状态接口
 */
interface UploadContext {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  totalChunks: number;
  receivedChunks: Set<number>;
  pendingChunks: Map<number, Uint8Array>;
  nextChunkToProcess: number;
  chunkSize: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  status: FileTransferStatus;
  storage: IndexedDBFileStorage;
  fileWriter?: WritableStreamDefaultWriter<Uint8Array>;
  error?: string;
  startTime: number;
  transferCompleted: boolean; // 标记传输是否已完成
}

/**
 * 主机上传处理器
 * 负责接收客户端上传的文件并存储
 */
export class HostUploadHandler {
  private messageHandler: HostMessageHandler;
  private activeUploads: Map<string, UploadContext> = new Map();
  private dbName = 'host-uploads';
  
  constructor(messageHandler: HostMessageHandler) {
    this.messageHandler = messageHandler;
  }
  
  /**
   * 处理上传请求
   * @param payload 请求数据
   * @param requestId 请求ID
   */
  async handleUploadRequest(payload: FileUploadRequest, requestId: string): Promise<void> {
    try {
      // 检查是否允许文件上传
      const { allowFileUploads } = useWebRTCHostStore.getState();
      if (!allowFileUploads) {
        throw new Error('文件上传未启用。请在分享设置中启用文件上传功能。');
      }
      
      const { fileName, fileType, fileSize, totalChunks, chunkSize, metadata } = payload;
      
      // 生成上传ID
      const uploadId = uuidv4();
      
      // 初始化存储
      const storage = new IndexedDBFileStorage(this.dbName);
      
      // 创建文件写入流
      const writableStream = storage.createFileWriter(fileName, fileType, fileSize);
      
      // 获取写入器
      const fileWriter = writableStream.getWriter();
      
      // 创建上传上下文
      const uploadContext: UploadContext = {
        id: uploadId,
        fileName,
        fileType,
        fileSize,
        totalChunks,
        receivedChunks: new Set<number>(),
        pendingChunks: new Map<number, Uint8Array>(),
        nextChunkToProcess: 0,
        chunkSize,
        metadata,
        status: FileTransferStatus.INITIALIZING,
        storage,
        fileWriter,
        startTime: Date.now(),
        transferCompleted: false
      };
      
      // 保存上下文
      this.activeUploads.set(uploadId, uploadContext);
      
      // 设置自动清理
      this.setupAutoCleaning(uploadId);
      
      // 构造响应
      const response: FileUploadResponse = {
        uploadId,
        ready: true
      };
      
      // 发送响应
      const message: WebRTCMessage = {
        type: MessageType.FILE_UPLOAD_RESPONSE,
        payload: response,
        requestId
      };
      
      uploadContext.status = FileTransferStatus.TRANSFERRING;
      
      this.messageHandler.sendResponse(message);
      
    } catch (error) {
      this.sendErrorResponse((error as Error).message, requestId);
    }
  }
  
  /**
   * 处理上传块
   * @param payload 块数据
   * @param requestId 请求ID
   */
  async handleUploadChunk(payload: FileUploadChunk, requestId: string): Promise<void> {
    const { uploadId, chunkIndex, data, isLast } = payload;
    
    try {
      // 获取上传上下文
      const context = this.activeUploads.get(uploadId);
      if (!context) {
        throw new Error(`未找到上传ID: ${uploadId}`);
      }
      
      // 检查索引是否有效
      if (chunkIndex < 0 || chunkIndex >= context.totalChunks) {
        throw new Error(`无效的块索引: ${chunkIndex}`);
      }
      
      // 检查块是否已经接收
      if (context.receivedChunks.has(chunkIndex)) {
        console.warn(`重复的块索引: ${chunkIndex}, 忽略`);
        
        // 发送成功响应
        const response: FileUploadResponse = {
          uploadId,
          ready: true
        };
        
        const message: WebRTCMessage = {
          type: MessageType.FILE_UPLOAD_RESPONSE,
          payload: response,
          requestId
        };
        
        this.messageHandler.sendResponse(message);
        return;
      }
      
      // 将base64数据转换为Uint8Array
      const binaryData = Buffer.from(data, 'base64');
      const bytes = new Uint8Array(binaryData);
      
      // 标记为已接收
      context.receivedChunks.add(chunkIndex);
      
      // 将数据存储在待处理队列中，而不是直接写入文件
      context.pendingChunks.set(chunkIndex, bytes);
      
      // 尝试按顺序处理可处理的块
      await this.processChunksInOrder(context);
      
      // 发送成功响应
      const response: FileUploadResponse = {
        uploadId,
        ready: true
      };
      
      const message: WebRTCMessage = {
        type: MessageType.FILE_UPLOAD_RESPONSE,
        payload: response,
        requestId
      };
      
      this.messageHandler.sendResponse(message);
      
      // 如果接收完所有块且已经全部处理完毕，自动完成上传
      if ((isLast || context.receivedChunks.size === context.totalChunks) && 
          context.nextChunkToProcess >= context.totalChunks) {
        await this.handleUploadComplete(uploadId, context.fileName, context.fileSize);
      }
      
    } catch (error) {
      console.log('处理上传块时出错:', uploadId, chunkIndex, isLast, (error as Error).message);
      this.sendErrorResponse((error as Error).message, requestId);
    }
  }

  private async handleUploadComplete(uploadId: string, fileName: string, fileSize: number): Promise<void> {
    await this.finalizeUpload(uploadId);
    // 发送完成消息
    const completeMessage: WebRTCMessage = {
      type: MessageType.FILE_UPLOAD_COMPLETE,
      payload: {
        uploadId,
        success: true,
        fileName,
        fileSize
      },
      requestId: uuidv4() // 使用新的请求ID
    };
    
    this.messageHandler.sendResponse(completeMessage);
  }
  
  /**
   * 处理取消上传请求
   * @param payload 取消请求信息
   * @param requestId 请求ID
   */
  async handleUploadCancel(payload: FileUploadCancel, requestId: string): Promise<void> {
    try {
      const { uploadId } = payload;
      
      // 获取上传上下文
      const context = this.activeUploads.get(uploadId);
      if (!context) {
        // 如果上下文不存在，则静默忽略
        return;
      }
      
      // 标记为未完成
      context.transferCompleted = false;
      
      // 清理资源
      await this.cleanupUpload(uploadId);
      
      // 发送确认响应
      const message: WebRTCMessage = {
        type: MessageType.FILE_UPLOAD_RESPONSE,
        payload: {
          uploadId,
          ready: false,
          error: '上传已取消'
        },
        requestId
      };
      
      this.messageHandler.sendResponse(message);
      
    } catch (error) {
      this.sendErrorResponse((error as Error).message, requestId);
    }
  }
  
  /**
   * 完成上传，关闭文件写入器
   * @param uploadId 上传ID
   */
  private async finalizeUpload(uploadId: string): Promise<void> {
    const context = this.activeUploads.get(uploadId);
    if (!context) {
      throw new Error(`未找到上传ID: ${uploadId}`);
    }
    
    try {
      // 关闭文件写入器，完成文件存储
      if (context.fileWriter) {
        await context.fileWriter.close();
      }
      
      // 标记传输完成
      context.transferCompleted = true;
      
      // 清理资源
      await this.cleanupUpload(uploadId);
    } catch (error) {
      // 清理资源
      await this.cleanupUpload(uploadId);
      throw error;
    }
  }
  
  /**
   * 清理上传资源
   * @param uploadId 上传ID
   */
  private async cleanupUpload(uploadId: string): Promise<void> {
    const context = this.activeUploads.get(uploadId);
    if (context) {
      try {
        // 关闭文件写入器
        if (context.fileWriter) {
          try {
            // 尝试中止写入，如果还在写入中
            await context.fileWriter.abort();
          } catch (e) {
            // 忽略中止错误，可能写入器已关闭
            console.warn(`中止文件写入器失败: ${e}`);
          }
        }
        
        // 只删除未完成传输的文件
        if (!context.transferCompleted) {
          // 从IndexedDB中删除未完成的文件
          try {
            await context.storage.deleteFile(context.fileName);
            console.log(`已从IndexedDB中删除未完成文件: ${context.fileName}`);
          } catch (e) {
            // 忽略删除错误，文件可能不存在
            console.warn(`从IndexedDB删除文件失败: ${e}`);
          }
        }
        
        // 关闭存储连接
        context.storage.close();
      } finally {
        // 无论成功失败，都删除上下文
        this.activeUploads.delete(uploadId);
      }
    }
  }
  
  /**
   * 按顺序处理已接收的块
   * @param context 上传上下文
   */
  private async processChunksInOrder(context: UploadContext): Promise<void> {
    // 从nextChunkToProcess开始，处理所有连续的块
    let nextIndex = context.nextChunkToProcess;
    
    while (context.pendingChunks.has(nextIndex)) {
      // 获取块数据
      const chunk = context.pendingChunks.get(nextIndex);
      if (!chunk) break;
      
      try {
        // 将数据写入文件写入器
        if (context.fileWriter) {
          await context.fileWriter.ready; // 确保写入器已就绪
          await context.fileWriter.write(chunk);
        } else {
          throw new Error('文件写入器未初始化');
        }
        
        // 从待处理Map中移除已处理的块，减少内存占用
        context.pendingChunks.delete(nextIndex);
        
        // 更新下一个需要处理的块
        nextIndex++;
        context.nextChunkToProcess = nextIndex;
      } catch (error) {
        console.error('写入文件时出错:', error);
        break;
      }
    }
  }
  
  /**
   * 设置自动清理超时的上传
   * @param uploadId 上传ID
   * @param timeout 超时时间（毫秒），默认30分钟
   */
  private setupAutoCleaning(uploadId: string, timeout = 30 * 60 * 1000): void {
    setTimeout(async () => {
      const context = this.activeUploads.get(uploadId);
      if (context) {
        // 检查是否已经超时
        const now = Date.now();
        const elapsed = now - context.startTime;
        
        if (elapsed >= timeout) {
          // 标记为未完成，确保文件会被删除（如果之前没有显式标记为已完成）
          if (!context.transferCompleted) {
            console.log(`上传超时，标记为未完成: ${uploadId}, 文件: ${context.fileName}`);
            // 清理资源
            await this.cleanupUpload(uploadId);
            console.log(`已自动清理超时上传: ${uploadId}, 文件: ${context.fileName}, 传输完成状态: ${context.transferCompleted}`);
          } else {
            // 如果已完成，只清理上下文，不删除文件
            console.log(`已完成上传的上下文超时: ${uploadId}, 文件: ${context.fileName}, 保留文件数据`);
            // 只关闭连接和删除上下文，不删除文件
            context.storage.close();
            this.activeUploads.delete(uploadId);
          }
        } else {
          // 重新设置超时
          this.setupAutoCleaning(uploadId, timeout - elapsed);
        }
      }
    }, Math.min(timeout, 2147483647)); // 防止超过最大setTimeout时间
  }
  
  /**
   * 发送错误响应
   * @param error 错误信息
   * @param requestId 请求ID
   */
  private sendErrorResponse(error: string, requestId: string): void {
    if (!requestId) return;
    
    const message: WebRTCMessage = {
      type: MessageType.ERROR,
      payload: { error },
      requestId
    };
    
    this.messageHandler.sendResponse(message);
  }
}
