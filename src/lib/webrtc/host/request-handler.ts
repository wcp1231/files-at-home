import { DataConnection } from 'peerjs';
import { FSDirectory, FSFile } from "@/lib/filesystem";
import { 
  MessageType, 
  serializeMessage, 
  SharedFileInfo,
  handleToSharedFileInfo 
} from '@/lib/webrtc';

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
      this.sendErrorResponse(conn, filePath, err.message || '文件处理错误', requestId);
    }
  }

  // 处理文件数据请求
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
      
      // 读取文件内容为ArrayBuffer
      const arrayBuffer = await fileObj.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');

      // 发送文件数据
      const message = {
        type: MessageType.FILE_DATA_RESPONSE,
        payload: {
          name: file.name,
          size: file.size,
          type: file.type,
          data: base64
        },
        requestId
      };
      
      conn.send(serializeMessage(message));
    } catch (err: any) {
      this.sendErrorResponse(conn, filePath, err.message || '文件处理错误', requestId);
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