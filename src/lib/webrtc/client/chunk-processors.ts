import { FileChunkResponse, FileTransfer, FileTransferInfo, FileTransferStatus } from '@/lib/webrtc';

/**
 * 块处理器接口，定义所有块处理器需要实现的方法
 */
export interface ChunkProcessor {
  /**
   * 处理接收到的块
   */
  processChunk(chunk: FileChunkResponse): void;

  /**
   * 请求缺失的块
   */
  requestMissingChunks(): void;

  /**
   * 检查是否应该完成传输
   */
  shouldComplete(chunk: FileChunkResponse): boolean;

  /**
   * 完成传输
   */
  complete(): Promise<Blob>;

  /**
   * 取消传输
   */
  cancel(reason: Error): void;

  /**
   * 获取当前进度
   */
  getProgress(): { progress: number, speed: number };
  
  /**
   * 获取传输状态对象
   */
  getTransfer(): FileTransfer;
}

/**
 * 基础块处理器抽象类，实现一些共用的功能
 */
export abstract class BaseChunkProcessor implements ChunkProcessor {
  protected parentRequestId: string;
  protected fileId: string;
  protected transferInfo: FileTransferInfo;
  protected transfer: FileTransfer;
  protected startTime: number;
  protected requestChunkCallback: (fileId: string, chunkIndex: number, filePath: string, start: number, end: number) => void;
  protected onProgressCallback?: (fileId: string, progress: number, speed: number) => void;
  protected onTransferStatusChangeCallback?: (transfer: FileTransfer) => void;
  protected onErrorCallback?: (error: Error) => void;
  protected resolver: (data: Blob) => void;
  protected rejecter: (error: Error) => void;
  
  constructor(
    parentRequestId: string,
    fileId: string,
    transferInfo: FileTransferInfo,
    requestChunkCallback: (fileId: string, chunkIndex: number, filePath: string, start: number, end: number) => void,
    resolver: (data: Blob) => void,
    rejecter: (error: Error) => void,
    onProgressCallback?: (fileId: string, progress: number, speed: number) => void,
    onTransferStatusChangeCallback?: (transfer: FileTransfer) => void,
    onErrorCallback?: (error: Error) => void
  ) {
    this.parentRequestId = parentRequestId;
    this.fileId = fileId;
    this.transferInfo = transferInfo;
    this.requestChunkCallback = requestChunkCallback;
    this.resolver = resolver;
    this.rejecter = rejecter;
    this.onProgressCallback = onProgressCallback;
    this.onTransferStatusChangeCallback = onTransferStatusChangeCallback;
    this.onErrorCallback = onErrorCallback;
    this.startTime = Date.now();
    
    // 创建传输对象
    this.transfer = {
      fileId,
      name: transferInfo.name,
      path: transferInfo.path,
      size: transferInfo.size,
      type: transferInfo.type,
      progress: 0,
      speed: 0,
      status: FileTransferStatus.INITIALIZING,
      startTime: this.startTime
    };
    
    this.updateTransferStatus(FileTransferStatus.TRANSFERRING);
  }
  
  protected updateTransferStatus(status: FileTransferStatus): void {
    this.transfer = {
      ...this.transfer,
      status
    }
    if (status === FileTransferStatus.COMPLETED || status === FileTransferStatus.ERROR || status === FileTransferStatus.CANCELLED) {
      this.transfer = {
        ...this.transfer,
        endTime: Date.now()
      }
    }
    this.notifyTransferStatusChange();
  }
  
  protected notifyTransferStatusChange(): void {
    if (this.onTransferStatusChangeCallback) {
      this.onTransferStatusChangeCallback(this.transfer);
    }
  }
  
  protected notifyProgress(progress: number, speed: number): void {
    if (this.onProgressCallback) {
      this.onProgressCallback(this.fileId, progress, speed);
    }
  }
  
  abstract processChunk(chunk: FileChunkResponse): void;
  abstract requestMissingChunks(): void;
  abstract shouldComplete(chunk: FileChunkResponse): boolean;
  abstract complete(): Promise<Blob>;
  
  getTransfer(): FileTransfer {
    return this.transfer;
  }
  
  cancel(reason: Error): void {
    this.updateTransferStatus(FileTransferStatus.CANCELLED);
    this.rejecter(reason);
  }
  
  abstract getProgress(): { progress: number, speed: number };
}

/**
 * 缓冲式块处理器，将所有块缓存后再组装
 */
export class BufferedChunkProcessor extends BaseChunkProcessor {
  private receivedChunks = new Map<number, Uint8Array>();
  
  processChunk(chunk: FileChunkResponse): void {
    // 存储收到的块
    const binaryData = Buffer.from(chunk.data, 'base64');
    const chunkData = new Uint8Array(binaryData);
    this.receivedChunks.set(chunk.chunkIndex, chunkData);
    
    // 更新进度
    const progress = this.getProgress();
    this.transfer = {
      ...this.transfer,
      progress: progress.progress,
      speed: progress.speed
    }
    
    // 通知进度更新
    this.notifyProgress(progress.progress, progress.speed);
    this.notifyTransferStatusChange();
    
    // 如果收到了所有块但不是最后一个，请求下一个块
    if (!this.shouldComplete(chunk) && this.receivedChunks.size < this.transferInfo.totalChunks) {
      this.requestNextChunk();
    }
  }
  
  requestNextChunk(): void {
    const receivedChunks = Array.from(this.receivedChunks.keys());
    for (let i = 0; i < this.transferInfo.totalChunks; i++) {
      if (!receivedChunks.includes(i)) {
        // 请求缺失的块，但只请求下一个
        this.requestChunkCallback(this.fileId, i, this.transferInfo.path, this.transferInfo.start, this.transferInfo.end);
        break;
      }
    }
  }
  
  requestMissingChunks(): void {
    const missingChunks = [];
    for (let i = 0; i < this.transferInfo.totalChunks; i++) {
      if (!this.receivedChunks.has(i)) {
        missingChunks.push(i);
      }
    }
    
    for (const chunkIndex of missingChunks) {
      this.requestChunkCallback(this.fileId, chunkIndex, this.transferInfo.path, this.transferInfo.start, this.transferInfo.end);
    }
  }
  
  shouldComplete(chunk: FileChunkResponse): boolean {
    return chunk.isLast || this.receivedChunks.size === this.transferInfo.totalChunks;
  }
  
  async complete(): Promise<Blob> {
    this.updateTransferStatus(FileTransferStatus.ASSEMBLING);
    
    try {
      // 如果只有一个块，直接使用它
      if (this.transferInfo.totalChunks === 1 && this.receivedChunks.has(0)) {
        const chunk = this.receivedChunks.get(0)!;
        const blob = new Blob([chunk], { type: this.transferInfo.type });
        this.updateTransferStatus(FileTransferStatus.COMPLETED);
        return blob;
      } else {
        // 合并所有块
        const chunks: Uint8Array[] = [];
        let isComplete = true;
        
        for (let i = 0; i < this.transferInfo.totalChunks; i++) {
          if (!this.receivedChunks.has(i)) {
            isComplete = false;
            break;
          }
          chunks.push(this.receivedChunks.get(i)!);
        }
        
        if (isComplete) {
          // 合并所有块创建最终文件
          const blob = new Blob(chunks, { type: this.transferInfo.type });
          this.updateTransferStatus(FileTransferStatus.COMPLETED);
          return blob;
        } else {
          // 请求缺失的块
          this.requestMissingChunks();
          throw new Error('传输未完成，缺少部分块');
        }
      }
    } catch (error: unknown) {
      this.updateTransferStatus(FileTransferStatus.ERROR);
      this.transfer = {
        ...this.transfer,
        error: error instanceof Error ? error.message : String(error)
      }
      throw error;
    }
  }
  
  getProgress(): { progress: number, speed: number } {
    const progress = (this.receivedChunks.size / this.transferInfo.totalChunks) * 100;
    
    // 计算速度 (字节/秒)
    const elapsedSeconds = (Date.now() - this.startTime) / 1000 || 0.001; // 防止除零
    const receivedBytes = [...this.receivedChunks.values()].reduce(
      (sum, chunk) => sum + chunk.length, 0
    );
    const speed = elapsedSeconds > 0 ? receivedBytes / elapsedSeconds : 0;
    
    return { progress, speed };
  }
}

/**
 * 流式块处理器，边接收边处理
 */
export class StreamChunkProcessor extends BaseChunkProcessor {
  private stream: WritableStream<Uint8Array>;
  private streamWriter: WritableStreamDefaultWriter<Uint8Array>;
  private processedChunks = new Set<number>();
  private receivedChunks = new Map<number, Uint8Array>(); // 临时存储乱序的块
  private nextChunkToProcess = 0;
  private totalBytesProcessed = 0;
  
  constructor(
    parentRequestId: string,
    fileId: string,
    transferInfo: FileTransferInfo,
    stream: WritableStream<Uint8Array>,
    requestChunkCallback: (fileId: string, chunkIndex: number, filePath: string, start: number, end: number) => void,
    resolver: (data: Blob) => void,
    rejecter: (error: Error) => void,
    onProgressCallback?: (fileId: string, progress: number, speed: number) => void,
    onTransferStatusChangeCallback?: (transfer: FileTransfer) => void,
    onErrorCallback?: (error: Error) => void
  ) {
    super(
      parentRequestId,
      fileId,
      transferInfo,
      requestChunkCallback,
      resolver, 
      rejecter,
      onProgressCallback,
      onTransferStatusChangeCallback,
      onErrorCallback
    );
    
    this.stream = stream;
    try {
      this.streamWriter = stream.getWriter();
    } catch (error) {
      console.error('Failed to get stream writer:', error);
      throw error;
    }
  }
  
  async processChunk(chunk: FileChunkResponse): Promise<void> {
    // 解码和存储块数据
    const binaryData = Buffer.from(chunk.data, 'base64');
    const chunkData = new Uint8Array(binaryData);
    this.receivedChunks.set(chunk.chunkIndex, chunkData);
    this.processedChunks.add(chunk.chunkIndex);
    
    // 尝试按顺序处理块
    await this.processChunksInOrder(chunk.chunkIndex);
    
    // 更新进度
    const progress = this.getProgress();
    this.transfer = {
      ...this.transfer,
      progress: progress.progress,
      speed: progress.speed
    }
    
    // 通知进度更新
    this.notifyProgress(progress.progress, progress.speed);
    this.notifyTransferStatusChange();

    // 如果已经处理了所有块，则直接返回
    if (this.shouldComplete(chunk) || this.processedChunks.size >= this.transferInfo.totalChunks) {
      return
    }

    // 请求下一个块前，检查流写入器是否正常
    // 如果流写入器不正常，则抛出错误
    // 用于处理取消下载的情况
    const isStreamWriterReady = await this.checkStreamWriterReady();
    if (!isStreamWriterReady) {
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error('Stream writer not ready'));
      }
      return;
    }
    
    // 请求下一个块
    this.requestNextChunk();
  }
  
  private async processChunksInOrder(currentChunkIndex: number): Promise<void> {
    // 如果接收到的不是下一个需要处理的块，先缓存起来
    if (currentChunkIndex !== this.nextChunkToProcess) {
      return;
    }
    
    // 处理所有连续的块
    let nextIndex = this.nextChunkToProcess;
    while (this.receivedChunks.has(nextIndex)) {
      // 获取块数据
      const chunk = this.receivedChunks.get(nextIndex);
      if (!chunk) break;
      
      try {
        // 写入流
        await this.streamWriter.ready;
        await this.streamWriter.write(chunk);
        
        // 更新处理的字节数
        this.totalBytesProcessed += chunk.length;
        
        // 从缓存中移除已处理的块，减少内存占用
        this.receivedChunks.delete(nextIndex);
        
        // 更新下一个需要处理的块
        nextIndex++;
        this.nextChunkToProcess = nextIndex;
      } catch (error) {
        console.error('Error writing to stream:', error);
        break;
      }
    }
  }

  private async checkStreamWriterReady(): Promise<boolean> {
    try {
      await this.streamWriter.ready;
      return true;
    } catch (error) {
      return false;
    }
  }
  
  requestNextChunk(): void {
    for (let i = 0; i < this.transferInfo.totalChunks; i++) {
      if (!this.processedChunks.has(i)) {
        this.requestChunkCallback(this.fileId, i, this.transferInfo.path, this.transferInfo.start, this.transferInfo.end);
        break;
      }
    }
  }
  
  requestMissingChunks(): void {
    const missingChunks = [];
    for (let i = 0; i < this.transferInfo.totalChunks; i++) {
      if (!this.processedChunks.has(i)) {
        missingChunks.push(i);
      }
    }
    
    for (const chunkIndex of missingChunks) {
      this.requestChunkCallback(this.fileId, chunkIndex, this.transferInfo.path, this.transferInfo.start, this.transferInfo.end);
    }
  }
  
  shouldComplete(chunk: FileChunkResponse): boolean {
    return chunk.isLast || this.processedChunks.size === this.transferInfo.totalChunks;
  }
  
  async complete(): Promise<Blob> {
    try {
      this.updateTransferStatus(FileTransferStatus.ASSEMBLING);
      
      // 如果还有未处理的块，处理它们
      if (this.receivedChunks.size > 0) {
        const remainingChunks = Array.from(this.receivedChunks.keys()).sort();
        for (const index of remainingChunks) {
          await this.processChunksInOrder(index);
        }
      }
      
      // 关闭流
      await this.streamWriter.close();
      
      // 创建一个空的 Blob 作为结果 (实际内容已经写入流中)
      const emptyBlob = new Blob([], { type: this.transferInfo.type });
      this.updateTransferStatus(FileTransferStatus.COMPLETED);
      return emptyBlob;
    } catch (error: unknown) {
      // 处理错误
      this.updateTransferStatus(FileTransferStatus.ERROR);
      this.transfer = {
        ...this.transfer,
        error: error instanceof Error ? error.message : String(error)
      }
      
      try {
        // 尝试中止流
        await this.streamWriter.abort(error);
      } catch (abortError) {
        console.error('Error aborting stream:', abortError);
      }
      
      throw error;
    }
  }
  
  cancel(reason: Error): void {
    super.cancel(reason);
    try {
      this.streamWriter.abort(reason);
    } catch (error) {
      console.error('Error aborting stream:', error);
    }
  }
  
  getProgress(): { progress: number, speed: number } {
    const progress = (this.processedChunks.size / this.transferInfo.totalChunks) * 100;
    
    // 计算速度 (字节/秒)
    const elapsedSeconds = (Date.now() - this.startTime) / 1000 || 0.001; // 防止除零
    const speed = elapsedSeconds > 0 ? this.totalBytesProcessed / elapsedSeconds : 0;
    
    return { progress, speed };
  }
} 