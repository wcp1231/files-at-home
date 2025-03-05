import { DataConnection } from 'peerjs';
import { MessageType, deserializeMessage } from '@/lib/webrtc';
import { HostRequestHandler } from './request-handler';

export class HostMessageHandler {
  private requestHandler: HostRequestHandler;
  private onError: (error: string) => void;
  
  constructor(requestHandler: HostRequestHandler, onError: (error: string) => void) {
    this.requestHandler = requestHandler;
    this.onError = onError;
  }
  
  handleMessage(conn: DataConnection, data: string) {
    try {
      const message = deserializeMessage(data);
      
      switch (message.type) {
        case MessageType.FILE_INFO_REQUEST:
          // 处理文件请求
          this.requestHandler.handleFileRequest(conn, message.payload, message.requestId);
          break;
          
        case MessageType.FILE_DATA_REQUEST:
          // 处理文件内容请求
          this.requestHandler.handleFileDataRequest(conn, message.payload, message.requestId);
          break;
          
        case MessageType.DIRECTORY_REQUEST:
          // 处理目录请求
          this.requestHandler.handleDirectoryRequest(conn, message.payload, message.requestId);
          break;
          
        case MessageType.ERROR:
          // 处理客户端发来的错误消息
          const errorMsg = typeof message.payload === 'string' 
            ? message.payload 
            : message.payload?.message || '未知错误';
          this.onError(errorMsg);
          break;
          
        default:
          console.log('Unhandled message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }
}

export default HostMessageHandler; 