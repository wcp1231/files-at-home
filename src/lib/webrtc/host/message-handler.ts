import { DataConnection } from 'peerjs';
import { MessageType, WebRTCMessage, deserializeMessage } from '@/lib/webrtc';
import { HostRequestHandler } from './request-handler';
import { hostCrypto } from '@/lib/webrtc/crypto';

export class HostMessageHandler {
  private requestHandler: HostRequestHandler;
  private onError: (error: string) => void;
  
  constructor(requestHandler: HostRequestHandler, onError: (error: string) => void) {
    this.requestHandler = requestHandler;
    this.requestHandler.setMessageHandler(this);
    this.onError = onError;
  }
  
  // TODO 可以分两个阶段，握手阶段结束后，再处理其他消息
  async handleMessage(conn: DataConnection, data: string) {
    try {
      const message = await this.deserializeRequest(data);
      const requestId = message.requestId;
      
      switch (message.type) {
        case MessageType.META_REQUEST:
          // 处理元数据请求
          this.requestHandler.handleMetaRequest(conn, message.payload, requestId);
          break;
        case MessageType.DIRECTORY_REQUEST:
          // 处理目录请求
          this.requestHandler.handleDirectoryRequest(conn, message.payload.path, requestId);
          break;
          
        case MessageType.FILE_TRANSFER_REQUEST:
          // 处理文件信息请求并开始传输
          this.requestHandler.handleFileTransferRequest(conn, message.payload, requestId);
          break;
        case MessageType.FILE_INFO_REQUEST:
          // 处理文件信息请求并开始传输
          this.requestHandler.handleFileRequest(conn, message.payload.path, requestId);
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

  sendMetaResponse(conn: DataConnection, message: WebRTCMessage) {
    conn.send(JSON.stringify(message));
  }

  async sendResponse(conn: DataConnection, message: WebRTCMessage) {
    conn.send(await this.serializeResponse(message));
  }

  private async serializeResponse(message: WebRTCMessage) {
    // 如果还没有密钥，则不加密
    if (!hostCrypto.hasKey()) {
      return JSON.stringify(message);
    }

    const encodedPlaintext = JSON.stringify(message);
    const { encrypted, iv } = await hostCrypto.encryptString(encodedPlaintext);
    const encryptedMessage = {
      type: MessageType.ENCRYPTED_RESPONSE,
      payload: { encrypted, iv }
    };
    return JSON.stringify(encryptedMessage);
  }

  private async deserializeRequest(data: string) {
    const message = deserializeMessage(data);
    if (message.type === MessageType.ERROR) {
      return message
    }

    if (message.type === MessageType.ENCRYPTED_REQUEST) {
      const { encrypted, iv } = message.payload;
      const decryptedData = await hostCrypto.decryptString(encrypted, iv);
      return deserializeMessage(decryptedData);
    }

    return message;
  }
}

export default HostMessageHandler; 