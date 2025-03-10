import { DataConnection } from 'peerjs';
import { MessageType, deserializeMessage } from '@/lib/webrtc';
import { ClientRequestManager } from './request-manager';

export class ClientMessageHandler {
  private requestManager: ClientRequestManager;
  private onError: (error: string) => void;
  
  constructor(requestManager: ClientRequestManager, onError: (error: string) => void) {
    this.requestManager = requestManager;
    this.onError = onError;
  }
  
  handleMessage(conn: DataConnection, data: string) {
    try {
      const message = deserializeMessage(data);
      
      switch (message.type) {
        case MessageType.FILE_INFO_RESPONSE:
          // 处理文件信息响应
          this.requestManager.handleFileInfoResponse(message.requestId!, message.payload);
          break;
          
        case MessageType.DIRECTORY_RESPONSE:
          // 处理目录响应
          this.requestManager.handleDirectoryResponse(message.requestId!, message.payload);
          break;
          
        case MessageType.FILE_TRANSFER_RESPONSE:
          // 处理文件信息和传输响应
          this.requestManager.handleFileTransferResponse(message.requestId!, message.payload);
          break;
          
        case MessageType.FILE_CHUNK:
          // 处理文件块
          this.requestManager.handleFileChunkResponse(message.requestId!, message.payload);
          break;
          
        case MessageType.FILE_TRANSFER_CANCEL:
          // 处理传输取消
          if (message.payload && message.payload.fileId) {
            this.requestManager.cancelFileTransfer(message.payload.fileId);
          }
          break;

          case MessageType.ERROR:
          // 处理错误响应
          this.requestManager.handleErrorResponse(message.requestId!, message.payload.error);
          this.onError(message.payload.error);
          break;
        default:
          console.log('Unhandled message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }
}

export default ClientMessageHandler; 