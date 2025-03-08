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
      const requestId = message.requestId;
      
      switch (message.type) {
        case MessageType.DIRECTORY_REQUEST:
          // 处理目录请求
          this.requestHandler.handleDirectoryRequest(conn, message.payload.path, requestId);
          break;
          
        case MessageType.FILE_INFO_REQUEST:
          // 处理文件信息请求并开始传输
          this.requestHandler.handleFileInfoAndTransferRequest(conn, message.payload.path, requestId);
          break;
          
        case MessageType.FILE_CHUNK_REQUEST:
          // 处理文件块请求
          this.requestHandler.handleFileChunkRequest(conn, message.payload, requestId);
          break;
          
        case MessageType.FILE_TRANSFER_CANCEL:
          // 处理取消传输
          // TODO: 实现取消逻辑
          break;
          
        case MessageType.ERROR:
          // 处理客户端发来的错误消息
          console.error('Client error:', message.payload);
          this.onError(message.payload);
          break;
          
        default:
          console.log('主机端收到未处理的消息类型:', message.type);
      }
    } catch (error) {
      console.error('解析消息失败:', error);
    }
  }
}

export default HostMessageHandler; 