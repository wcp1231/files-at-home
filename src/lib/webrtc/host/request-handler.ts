import { DataConnection } from 'peerjs';
import { FSDirectory, FSFile } from "@/lib/filesystem";
import { 
  MessageType, 
  serializeMessage, 
  SharedFileInfo,
  handleToSharedFileInfo,
  FileChunk,
  FileTransferInfo
} from '@/lib/webrtc';
import { v4 as uuidv4 } from 'uuid';

// 常量配置
const MAX_CHUNK_SIZE = 64 * 1024; // 64KB 块大小

export class HostRequestHandler {
  private getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>;
  private getFile: (filePath: string) => Promise<FSFile | null>;

  constructor(
    getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>,
    getFile: (filePath: string) => Promise<FSFile | null>
  ) {
    this.getDirectory = getDirectory;
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
  async handleFileDataRequest(
    conn: DataConnection,
    filePath: string,
    requestId?: string
  ) {
    try {
      const file = await this.getFile(filePath);
      if (!file) {
        throw new Error('文件不存在');
      }
      
      // 获取文件对象
      const fileObj = await file.getFile();
      
      // 统一使用分块传输方式处理文件
      await this.handleFileTransfer(conn, file, fileObj, requestId);
    } catch (err: any) {
      this.sendErrorResponse(conn, filePath, err.message || '文件处理错误', requestId);
    }
  }
  
  // 统一的文件传输方法
  private async handleFileTransfer(
    conn: DataConnection,
    file: FSFile,
    fileObj: File,
    requestId?: string
  ) {
    // 生成文件传输ID
    const fileId = uuidv4();
    
    // 计算分块信息
    const totalSize = file.size!;
    const chunkSize = MAX_CHUNK_SIZE;
    const totalChunks = Math.ceil(totalSize / chunkSize);
    
    // 如果是小文件(只有一个块)，自动发送这个块
    if (totalChunks === 1) {
      const buffer = await fileObj.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString('base64');
      
      // 发送唯一的数据块 - 同时包含开始和结束的信息
      const chunk: FileChunk = {
        fileId,
        chunkIndex: 0,
        totalChunks: 1,
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
      const buffer = await fileObj.arrayBuffer();
      const firstChunkSize = Math.min(chunkSize, buffer.byteLength);
      const firstChunkBuffer = buffer.slice(0, firstChunkSize);
      const base64Data = Buffer.from(firstChunkBuffer).toString('base64');
      
      // 发送第一个块，包含文件信息
      const chunk: FileChunk = {
        fileId,
        chunkIndex: 0,
        totalChunks,
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
    payload: { fileId: string, chunkIndex: number, filePath: string },
    requestId?: string
  ) {
    try {
      const { fileId, chunkIndex, filePath } = payload;
      const file = await this.getFile(filePath);
      
      if (!file) {
        throw new Error('文件不存在');
      }
      
      const fileObj = await file.getFile();
      const totalSize = file.size!;
      const chunkSize = MAX_CHUNK_SIZE;
      const totalChunks = Math.ceil(totalSize / chunkSize);
      
      // 验证分块索引
      if (chunkIndex < 0 || chunkIndex >= totalChunks) {
        throw new Error(`无效的分块索引: ${chunkIndex}`);
      }
      
      // 计算分块范围
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, totalSize);
      
      // 读取文件对应范围的数据
      const buffer = await fileObj.arrayBuffer();
      const chunkBuffer = buffer.slice(start, end);
      const base64Data = Buffer.from(chunkBuffer).toString('base64');
      
      // 判断是否为最后一个块
      const isLast = chunkIndex === totalChunks - 1;
      
      // 创建分块消息
      const chunk: FileChunk = {
        fileId,
        chunkIndex,
        totalChunks,
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
      
      // 将目录中的文件和子目录转换为可共享的格式
      const fileList: SharedFileInfo[] = [];
      
      // 获取目录中的文件列表
      const files = await directory.getFiles();
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

  // 处理文件信息请求并开始传输
  async handleFileInfoAndTransferRequest(
    conn: DataConnection,
    filePath: string, 
    requestId?: string
  ) {
    try {
      const file = await this.getFile(filePath);
      if (!file) {
        throw new Error('文件不存在');
      }
      
      // 发送文件信息响应
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
      
      // 获取文件对象并开始传输
      const fileObj = await file.getFile();
      await this.handleFileTransfer(conn, file, fileObj, requestId);
    } catch (err: any) {
      this.sendErrorResponse(conn, filePath, err.message || '文件获取错误', requestId);
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