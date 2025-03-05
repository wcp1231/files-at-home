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
        case MessageType.DIRECTORY_RESPONSE:
          // 处理远程的目录列表响应
          if (message.requestId) {
            this.requestManager.handleDirectoryResponse(message.requestId, message.payload);
          } else {
            console.log('Received directory request without requestId:', message.payload);
          }
          break;
          
        case MessageType.FILE_INFO_RESPONSE:
          // 处理远程的文件信息响应
          if (message.requestId) {
            this.requestManager.handleFileInfoResponse(message.requestId, message.payload);
          } else {
            console.log('Received file info response without requestId:', message.payload);
          }
          break;
          
        case MessageType.FILE_DATA_RESPONSE:
          // 处理远程的文件数据请求响应
          if (message.requestId) {
            this.requestManager.handleFileDataResponse(message.requestId, message.payload);
          } else {
            console.log('Received file data request without requestId:', message.payload);
          }
          break;
          
        case MessageType.ERROR:
          // 处理错误响应
          const errorMsg = message.payload?.message || message.payload;
          this.onError(errorMsg);
          
          // 检查是否有关联的请求需要拒绝
          if (message.requestId) {
            this.requestManager.handleErrorResponse(message.requestId, errorMsg);
          }
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