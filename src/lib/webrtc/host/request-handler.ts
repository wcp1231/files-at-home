import { FSDirectory, FSEntry, FSFile } from "@/lib/filesystem";
import { 
  MessageType, 
  SharedFileInfo,
  handleToSharedFileInfo,
  DirectoryRequest,
  FileInfoRequest,
  FileTransferRequest,
  FileChunkRequest,
  FileChunkResponse,
  WebRTCMessage,
} from '@/lib/webrtc';
import { v4 } from 'uuid';
import { HostMessageHandler } from './message-handler';

// 常量配置
const MAX_CHUNK_SIZE = 512 * 1024; // 512KB 块大小

type FileSystem = {
  getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>;
  listFiles: (path: string) => Promise<FSEntry[] | null>;
  getFile: (filePath: string) => Promise<FSFile | null>;
};

export class HostRequestHandler {
  static FileSystem: FileSystem;
  static setFileSystem(fs: FileSystem) {
    HostRequestHandler.FileSystem = fs;
  }

  private messageHandler: HostMessageHandler;

  constructor(
    messageHandler: HostMessageHandler
  ) {
    this.messageHandler = messageHandler;
  }

  // 处理文件请求
  async handleFileRequest(
    payload: FileInfoRequest, 
    requestId?: string
  ) {
    try {
      const { path } = payload;
      const file = await HostRequestHandler.FileSystem.getFile(path);
      if (!file) {
        throw new Error('文件不存在');
      }
      
      const fileInfo: SharedFileInfo = {
        path: path,
        name: file.name,
        type: file.type!,
        size: file.size!,
        isDirectory: false,
        modifiedAt: file.modifiedAt?.toISOString(),
      }
      // 发送文件数据
      const message: WebRTCMessage = {
        type: MessageType.FILE_INFO_RESPONSE,
        payload: { file: fileInfo },
        requestId
      };
      
      this.messageHandler.sendResponse(message);
    } catch (err: unknown) {
      this.sendErrorResponse(err instanceof Error ? err.message : String(err), requestId);
    }
  }

  // 处理文件数据请求，统一使用分块传输方式
  // 处理文件信息请求并开始传输
  async handleFileTransferRequest(
    payload: FileTransferRequest, 
    requestId?: string
  ) {
    try {
      const { path } = payload;
      const file = await HostRequestHandler.FileSystem.getFile(path);
      if (!file) {
        throw new Error('文件不存在');
      }

      // 计算分块信息
      const start = payload.start ?? 0;
      const end = payload.end ?? file.size!;
      const totalSize = end - start;
      const chunkSize = MAX_CHUNK_SIZE;
      const totalChunks = Math.ceil(totalSize / chunkSize);
      const fileId = v4();
      
      // 发送文件信息响应
      const message: WebRTCMessage = {
        type: MessageType.FILE_TRANSFER_RESPONSE,
        payload: {
          fileId,
          path: path,
          name: file.name!,
          type: file.type!,
          size: file.size!,
          totalChunks,
          chunkSize,
          start,
          end
        },
        requestId
      };
      
      this.messageHandler.sendResponse(message);
      
      // 获取文件对象并开始传输
      const fileObj = await file.getFile();
      await this.handleFileTransfer(file, fileId, fileObj, start, end, requestId);
    } catch (err: unknown) {
      this.sendErrorResponse(err instanceof Error ? err.message : String(err), requestId);
    }
  }
  
  // 统一的文件传输方法
  private async handleFileTransfer(
    file: FSFile,
    fileId: string,
    fileObj: File,
    start: number,
    end: number,
    requestId?: string
  ) {
    // 计算分块信息
    const totalSize = end - start;
    const chunkSize = MAX_CHUNK_SIZE;
    const totalChunks = Math.ceil(totalSize / chunkSize);
    
    // 如果是小文件(只有一个块)，自动发送这个块
    if (totalChunks === 1) {
      const firstChunkBuffer = fileObj.slice(start, start + totalSize);
      const buffer = await firstChunkBuffer.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString('base64');
      
      // 发送唯一的数据块 - 同时包含开始和结束的信息
      const chunk: FileChunkResponse = {
        // 以文件路径作为文件ID
        fileId,
        chunkIndex: 0,
        data: base64Data,
        chunkSize: buffer.byteLength,
        // 添加文件信息字段
        fileName: file.name,
        fileSize: totalSize,
        fileType: file.type || '',
        filePath: file.path,
        // 标记为第一个也是最后一个块
        isFirst: true,
        isLast: true
      };
      
      const chunkMessage: WebRTCMessage = {
        type: MessageType.FILE_CHUNK_RESPONSE,
        payload: chunk,
        requestId
      };
      
      this.messageHandler.sendResponse(chunkMessage);
      return
    }

    // 对于大文件，我们只发送第一个块，其余的等待客户端请求
    // 首先准备第一个块
    const firstChunkSize = Math.min(chunkSize, totalSize);
    const firstChunkBuffer = fileObj.slice(start, start + firstChunkSize);
    const base64Data = Buffer.from(await firstChunkBuffer.arrayBuffer()).toString('base64');
    
    // 发送第一个块，包含文件信息
    const chunk: FileChunkResponse = {
      // 以文件路径作为文件ID
      fileId,
      chunkIndex: 0,
      data: base64Data,
      chunkSize: firstChunkSize,
      // 添加文件信息字段
      fileName: file.name,
      fileSize: totalSize,
      fileType: file.type || '',
      filePath: file.path,
      // 标记为第一个块
      isFirst: true,
      isLast: false
    };
    
    const chunkMessage: WebRTCMessage = {
      type: MessageType.FILE_CHUNK_RESPONSE,
      payload: chunk,
      requestId
    };
    
    this.messageHandler.sendResponse(chunkMessage);
  }

  // 处理文件块请求
  async handleFileChunkRequest(
    payload: FileChunkRequest,
    requestId?: string
  ) {
    try {
      const { fileId, chunkIndex, filePath } = payload;
      const offsetStart = payload.start;
      const offsetEnd = payload.end;

      const file = await HostRequestHandler.FileSystem.getFile(filePath);      
      if (!file) {
        throw new Error('文件不存在');
      }
      
      const fileObj = await file.getFile();
      const totalSize = offsetEnd - offsetStart;
      const chunkSize = MAX_CHUNK_SIZE;
      const totalChunks = Math.ceil(totalSize / chunkSize);
      
      // 验证分块索引
      if (chunkIndex < 0 || chunkIndex >= totalChunks) {
        throw new Error(`无效的分块索引: ${chunkIndex}`);
      }
      
      // 计算分块范围
      const start = offsetStart + chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, offsetEnd);
      
      // 从缓存的buffer中slice需要的部分
      const chunkBuffer = await fileObj.slice(start, end).arrayBuffer();
      const base64Data = Buffer.from(chunkBuffer).toString('base64');
      
      // 判断是否为最后一个块
      const isLast = chunkIndex === totalChunks - 1;
      
      // 创建分块消息
      const chunk: FileChunkResponse = {
        fileId,
        chunkIndex,
        data: base64Data,
        chunkSize: end - start,
        // 只在最后一个块添加isLast标记
        isLast
      };
      
      // 发送分块
      const message: WebRTCMessage = {
        type: MessageType.FILE_CHUNK_RESPONSE,
        payload: chunk,
        requestId
      };
      
      this.messageHandler.sendResponse(message);
    } catch (err: unknown) {
      this.sendErrorResponse(err instanceof Error ? err.message : String(err), requestId);
    }
  }

  // 处理目录请求
  async handleDirectoryRequest(
    payload: DirectoryRequest,
    requestId?: string
  ) {
    try {
      const { path } = payload;
      const directory = await HostRequestHandler.FileSystem.getDirectory(path, true);
      
      if (!directory) {
        throw new Error('目录不存在');
      }

      // 获取目录中的文件列表
      const files = await HostRequestHandler.FileSystem.listFiles(path);
      if (!files) {
        throw new Error('目录不存在');
      }

      // 将目录中的文件和子目录转换为可共享的格式
      const fileList: SharedFileInfo[] = [];
      for (const entry of files) {
        fileList.push(handleToSharedFileInfo(entry));
      }
      
      // 发送目录信息
      const message: WebRTCMessage = {
        type: MessageType.DIRECTORY_RESPONSE,
        payload: { files: fileList },
        requestId
      };
      
      this.messageHandler.sendResponse(message);
    } catch (err: unknown) {
      this.sendErrorResponse(err instanceof Error ? err.message : String(err), requestId);
    }
  }

  // 发送错误响应
  private sendErrorResponse(
    errorMessage: string, 
    requestId?: string
  ) {
    const message: WebRTCMessage = {
      type: MessageType.ERROR,
      payload: {
        error: errorMessage,
      },
      requestId
    };
    this.messageHandler.sendResponse(message);
  }
}
