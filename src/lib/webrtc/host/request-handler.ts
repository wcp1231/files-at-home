import { DataConnection } from 'peerjs';
import { FSDirectory, FSEntry, FSFile } from "@/lib/filesystem";
import { 
  MessageType, 
  serializeMessage, 
  SharedFileInfo,
  handleToSharedFileInfo,
  FileChunk,
} from '@/lib/webrtc';
import { v4 } from 'uuid';

// 常量配置
const MAX_CHUNK_SIZE = 512 * 1024; // 512KB 块大小

export class HostRequestHandler {
  private getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>;
  private listFiles: (path: string) => Promise<FSEntry[] | null>;
  private getFile: (filePath: string) => Promise<FSFile | null>;

  constructor(
    getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>,
    listFiles: (path: string) => Promise<FSEntry[] | null>,
    getFile: (filePath: string) => Promise<FSFile | null>
  ) {
    this.getDirectory = getDirectory;
    this.listFiles = listFiles;
    this.getFile = getFile;
  }

  // 处理文件请求
  async handleFileRequest(
    conn: DataConnection,
    filePath: string, 
    requestId?: string
  ) {
    try {
      const file = await this.getFile(filePath);
      if (!file) {
        throw new Error('文件不存在');
      }
      
      // 发送文件数据
      const message = {
        type: MessageType.FILE_INFO_RESPONSE,
        payload: {
          path: filePath,
          name: file.name,
          type: file.type,
          size: file.size,
          modifiedAt: file.modifiedAt?.toISOString(),
          isDirectory: false,
        },
        requestId
      };
      
      conn.send(serializeMessage(message));
    } catch (err: any) {
      this.sendErrorResponse(conn, filePath, err.message || '文件获取错误', requestId);
    }
  }

  // 处理文件数据请求，统一使用分块传输方式
  // 处理文件信息请求并开始传输
  async handleFileTransferRequest(
    conn: DataConnection,
    payload: { path: string, start?: number, end?: number }, 
    requestId?: string
  ) {
    try {
      const { path } = payload;
      const file = await this.getFile(path);
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
      const message = {
        type: MessageType.FILE_TRANSFER_RESPONSE,
        payload: {
          fileId,
          path: path,
          name: file.name,
          type: file.type,
          size: file.size,
          totalChunks,
          chunkSize,
          start,
          end
        },
        requestId
      };
      
      conn.send(serializeMessage(message));
      
      // 获取文件对象并开始传输
      const fileObj = await file.getFile();
      await this.handleFileTransfer(conn, file, fileId, fileObj, start, end, requestId);
    } catch (err: any) {
      this.sendErrorResponse(conn, payload.path, err.message || '文件获取错误', requestId);
    }
  }
  
  // 统一的文件传输方法
  private async handleFileTransfer(
    conn: DataConnection,
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
      const chunk: FileChunk = {
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
      
      const chunkMessage = {
        type: MessageType.FILE_CHUNK,
        payload: chunk,
        requestId
      };
      
      conn.send(serializeMessage(chunkMessage));
    } else {
      // 对于大文件，我们只发送第一个块，其余的等待客户端请求
      // 首先准备第一个块
      const firstChunkSize = Math.min(chunkSize, totalSize);
      const firstChunkBuffer = fileObj.slice(start, start + firstChunkSize);
      const base64Data = Buffer.from(await firstChunkBuffer.arrayBuffer()).toString('base64');
      
      // 发送第一个块，包含文件信息
      const chunk: FileChunk = {
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
      
      const chunkMessage = {
        type: MessageType.FILE_CHUNK,
        payload: chunk,
        requestId
      };
      
      conn.send(serializeMessage(chunkMessage));
    }
  }

  // 处理文件块请求
  async handleFileChunkRequest(
    conn: DataConnection,
    payload: { fileId: string, chunkIndex: number, filePath: string, start: number, end: number },
    requestId?: string
  ) {
    try {
      const { fileId, chunkIndex, filePath } = payload;
      const offsetStart = payload.start;
      const offsetEnd = payload.end;

      const file = await this.getFile(filePath);      
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
      const chunk: FileChunk = {
        fileId,
        chunkIndex,
        data: base64Data,
        chunkSize: end - start,
        // 只在最后一个块添加isLast标记
        isLast
      };
      
      // 发送分块
      const message = {
        type: MessageType.FILE_CHUNK,
        payload: chunk,
        requestId
      };
      
      conn.send(serializeMessage(message));
    } catch (err: any) {
      this.sendErrorResponse(conn, payload.filePath, err.message || '获取文件块错误', requestId);
    }
  }

  // 处理目录请求
  async handleDirectoryRequest(
    conn: DataConnection,
    path: string,
    requestId?: string
  ) {
    try {
      const directory = await this.getDirectory(path, true);
      
      if (!directory) {
        throw new Error('目录不存在');
      }

      // 获取目录中的文件列表
      const files = await this.listFiles(path);
      if (!files) {
        throw new Error('目录不存在');
      }

      // 将目录中的文件和子目录转换为可共享的格式
      const fileList: SharedFileInfo[] = [];
      for (const entry of files) {
        fileList.push(handleToSharedFileInfo(entry));
      }
      
      // 发送目录信息
      const message = {
        type: MessageType.DIRECTORY_RESPONSE,
        payload: fileList,
        requestId
      };
      
      conn.send(serializeMessage(message));
    } catch (err: any) {
      this.sendErrorResponse(conn, path, err.message || '目录处理错误', requestId);
    }
  }

  // 发送错误响应
  private sendErrorResponse(
    conn: DataConnection, 
    path: string, 
    errorMessage: string, 
    requestId?: string
  ) {
    const message = {
      type: MessageType.ERROR,
      payload: {
        message: errorMessage,
        path
      },
      requestId
    };
    
    conn.send(serializeMessage(message));
  }
}

export default HostRequestHandler; 