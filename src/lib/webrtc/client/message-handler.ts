import { DataConnection } from 'peerjs';
import { MessageType, WebRTCMessage, deserializeMessage } from '@/lib/webrtc';
import { ClientRequestManager } from './request-manager';
import { clientCrypto } from '../crypto';

export class ClientMessageHandler {
  private requestManager: ClientRequestManager;
  private onError: (error: string) => void;
  
  constructor(requestManager: ClientRequestManager, onError: (error: string) => void) {
    this.requestManager = requestManager;
    this.requestManager.setMessageHandler(this);
    this.onError = onError;
  }
  
  // TODO 可以分两个阶段，握手阶段结束后，再处理其他消息
  async handleMessage(conn: DataConnection, data: string) {
    try {
      const message = await this.deserializeResponse(data);
      
      switch (message.type) {
        case MessageType.META_RESPONSE:
          // 处理元数据响应
          this.requestManager.handleMetaResponse(message.requestId!, message.payload);
          break;

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

  sendMetaRequest(conn: DataConnection, message: WebRTCMessage) {
    conn.send(JSON.stringify(message));
  }

  async sendRequest(conn: DataConnection, message: WebRTCMessage) {
    conn.send(await this.serializeRequest(message));
  }

  private async serializeRequest(message: WebRTCMessage) {
    // 如果还没有密钥，则不加密
    if (!clientCrypto.hasKey()) {
      return JSON.stringify(message);
    }

    const encodedPlaintext = JSON.stringify(message);
    const { encrypted, iv } = await clientCrypto.encryptString(encodedPlaintext);
    const encryptedMessage = {
      type: MessageType.ENCRYPTED_REQUEST,
      payload: { encrypted, iv }
    };
    return JSON.stringify(encryptedMessage);
  }

  private async deserializeResponse(data: string) {
    const message = deserializeMessage(data);
    if (message.type === MessageType.ERROR) {
      return message
    }

    if (message.type === MessageType.ENCRYPTED_RESPONSE) {
      const { encrypted, iv } = message.payload;
      const decryptedData = await clientCrypto.decryptString(encrypted, iv);
      return deserializeMessage(decryptedData);
    }

    return message;
  }
}

export default ClientMessageHandler; 