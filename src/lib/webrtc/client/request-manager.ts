import { DataConnection } from 'peerjs';
import { MessageType, serializeMessage, SharedFileInfo, FileChunk, FileTransferInfo, FileTransferStatus, FileTransfer } from '@/lib/webrtc';
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
  resolve: (data: Blob) => void;
  reject: (error: Error) => void;
  path: string;
}

export type RequestId = string;

// 文件传输状态接口
interface FileTransferState {
  transferInfo: FileTransferInfo;
  receivedChunks: Map<number, Uint8Array>;
  resolver: (data: Blob) => void;
  rejecter: (error: Error) => void;
  progress: number;
  startTime: number;
  transfer: FileTransfer;
}

export class ClientRequestManager {
  private pendingFileRequests: Map<RequestId, PendingFileRequest> = new Map();
  private pendingDirectoryRequests: Map<RequestId, PendingDirectoryRequest> = new Map();
  private pendingFileDataRequests: Map<RequestId, PendingFileDataRequest> = new Map();
  private connection: DataConnection | null = null;
  private timeoutDuration: number = 30000; // 30秒默认超时
  
  // 新增文件传输追踪
  private activeFileTransfers: Map<string, FileTransferState> = new Map();
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

  // 处理文件块消息 - 合并了之前的三个处理方法
  handleFileChunk(chunk: FileChunk, requestId?: string) {
    const fileId = chunk.fileId;
    
    // 如果是第一个块，且带有文件信息，创建新的传输状态
    if (chunk.isFirst && chunk.fileName && chunk.fileSize) {
      const request = requestId ? this.pendingFileDataRequests.get(requestId) : null;
      if (!request && !this.activeFileTransfers.has(fileId)) {
        console.warn('Received first chunk without active request:', fileId);
        return;
      }
      
      // 创建传输状态
      if (!this.activeFileTransfers.has(fileId) && request) {
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
        
        // 创建文件传输状态
        const transfer: FileTransfer = {
          fileId,
          fileName: chunk.fileName,
          filePath: chunk.filePath || '',
          fileSize: chunk.fileSize,
          progress: 0,
          speed: 0,
          status: FileTransferStatus.INITIALIZING,
          startTime: Date.now()
        };
        
        // 保存传输状态
        this.activeFileTransfers.set(fileId, {
          transferInfo,
          receivedChunks: new Map(),
          resolver: request.resolve,
          rejecter: request.reject,
          progress: 0,
          startTime: Date.now(),
          transfer
        });
        
        // 更新状态为传输中
        transfer.status = FileTransferStatus.TRANSFERRING;
        this.notifyTransferStatusChange(transfer);
      }
    }
    
    // 获取传输状态
    const transferState = this.activeFileTransfers.get(fileId);
    if (!transferState) {
      console.warn('Received chunk for unknown file transfer:', fileId);
      return;
    }
    
    // 存储分块数据
    const binaryData = Buffer.from(chunk.data, 'base64');
    transferState.receivedChunks.set(chunk.chunkIndex, new Uint8Array(binaryData));
    
    // 计算进度
    const progress = (transferState.receivedChunks.size / chunk.totalChunks) * 100;
    transferState.progress = progress;
    
    // 计算速度 (字节/秒)
    const elapsedSeconds = (Date.now() - transferState.startTime) / 1000 || 0.001; // 防止除零
    const receivedBytes = [...transferState.receivedChunks.values()].reduce(
      (sum, chunk) => sum + chunk.length, 0
    );
    const speed = elapsedSeconds > 0 ? receivedBytes / elapsedSeconds : 0;
    
    // 更新传输对象
    transferState.transfer.progress = progress;
    transferState.transfer.speed = speed;
    
    // 通知进度和状态变化
    this.updateProgress(fileId, progress, speed);
    this.notifyTransferStatusChange(transferState.transfer);
    
    // 如果是最后一个块或者已经接收所有块，组装文件
    if (chunk.isLast || transferState.receivedChunks.size === chunk.totalChunks) {
      this.assembleFile(fileId);
    } else if (transferState.receivedChunks.size < chunk.totalChunks) {
      // 请求下一个块
      const receivedChunks = Array.from(transferState.receivedChunks.keys());
      for (let i = 0; i < chunk.totalChunks; i++) {
        if (!receivedChunks.includes(i)) {
          // 请求缺失的块，但只请求下一个
          this.requestFileChunk(fileId, i, transferState.transferInfo.filePath);
          break;
        }
      }
    }
  }

  // 组装文件
  private assembleFile(fileId: string) {
    const transferState = this.activeFileTransfers.get(fileId);
    if (!transferState) return;
    
    const { transferInfo, receivedChunks, resolver } = transferState;
    
    try {
      // 更新传输状态
      transferState.transfer.status = FileTransferStatus.ASSEMBLING;
      transferState.transfer.progress = 100;
      transferState.transfer.endTime = Date.now();
      this.notifyTransferStatusChange(transferState.transfer);
      
      // 如果只有一个块，直接使用它
      if (transferInfo.totalChunks === 1 && receivedChunks.has(0)) {
        const chunk = receivedChunks.get(0)!;
        const blob = new Blob([chunk], { type: transferInfo.fileType });
        resolver(blob);
      } else {
        // 合并所有块
        const chunks: Uint8Array[] = [];
        let isComplete = true;
        
        for (let i = 0; i < transferInfo.totalChunks; i++) {
          if (!receivedChunks.has(i)) {
            isComplete = false;
            break;
          }
          chunks.push(receivedChunks.get(i)!);
        }
        
        if (isComplete) {
          // 合并所有块创建最终文件
          const blob = new Blob(chunks, { type: transferInfo.fileType });
          resolver(blob);
        } else {
          // 请求缺失的块
          const missingChunks = [];
          for (let i = 0; i < transferInfo.totalChunks; i++) {
            if (!receivedChunks.has(i)) {
              missingChunks.push(i);
            }
          }
          this.requestMissingChunks(fileId, transferInfo.filePath, missingChunks);
          return;
        }
      }
      
      // 更新状态并清理
      transferState.transfer.status = FileTransferStatus.COMPLETED;
      this.notifyTransferStatusChange(transferState.transfer);
      this.activeFileTransfers.delete(fileId);
    } catch (error: any) {
      transferState.transfer.status = FileTransferStatus.ERROR;
      transferState.transfer.error = error.message;
      this.notifyTransferStatusChange(transferState.transfer);
      transferState.rejecter(error);
      this.activeFileTransfers.delete(fileId);
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
  
  // 请求缺失的分块
  private requestMissingChunks(fileId: string, filePath: string, missingChunks: number[]) {
    if (!this.connection) {
      return;
    }
    
    // 对于每个缺失的分块，发送请求
    for (const chunkIndex of missingChunks) {
      this.requestFileChunk(fileId, chunkIndex, filePath);
    }
  }
  
  // 更新进度
  private updateProgress(fileId: string, progress: number, speed: number) {
    if (this.onProgressCallback) {
      this.onProgressCallback(fileId, progress, speed);
    }
  }
  
  // 取消文件传输
  cancelFileTransfer(fileId: string) {
    if (!this.connection || !this.activeFileTransfers.has(fileId)) {
      return;
    }
    
    const transfer = this.activeFileTransfers.get(fileId)!;
    
    // 发送取消消息
    const message = {
      type: MessageType.FILE_TRANSFER_CANCEL,
      payload: {
        fileId
      }
    };
    
    this.connection.send(serializeMessage(message));
    
    // 更新状态为已取消
    transfer.transfer.status = FileTransferStatus.CANCELLED;
    transfer.transfer.endTime = Date.now();
    this.notifyTransferStatusChange(transfer.transfer);
    
    // 拒绝 Promise
    transfer.rejecter(new Error('传输已取消'));
    
    // 延迟清理状态
    setTimeout(() => {
      this.activeFileTransfers.delete(fileId);
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
  async requestFileData(filePath: string): Promise<Blob> {
    if (!this.connection) {
      throw new Error('未连接');
    }
    
    // 生成请求ID
    const requestId = v4();
    
    const requestPromise = new Promise<Blob>((resolve, reject) => {
      const pendingRequest = {
        resolve,
        reject,
        path: filePath
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
      type: MessageType.FILE_INFO_REQUEST,
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
      payload: { path, },
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

  async workerMessageHandler(path: string, writer: WritableStreamDefaultWriter<Uint8Array>) {
    const blob = await this.requestFileData(path);
    const arrayBuffer = await blob.arrayBuffer();
    writer.write(new Uint8Array(arrayBuffer));
  }

  // 通知传输状态变化
  private notifyTransferStatusChange(transfer: FileTransfer) {
    if (this.onTransferStatusChange) {
      this.onTransferStatusChange(transfer);
    }
  }
  
  // 获取所有活跃传输
  getAllActiveTransfers(): FileTransfer[] {
    return Array.from(this.activeFileTransfers.values()).map(state => state.transfer);
  }
}

export default ClientRequestManager; 