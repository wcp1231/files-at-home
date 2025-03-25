import { MessageType, WebRTCMessage } from '@/lib/webrtc';
import { HostRequestHandler } from './request-handler';
import { ConnectionPhase } from './connection';
import { EnhancedConnection } from './enhanced-connection';
import { hostCrypto } from '../crypto';
import { HostUploadHandler } from './upload-handler';

export class HostMessageHandler {
  private connection: EnhancedConnection;
  private requestHandler: HostRequestHandler;
  private uploadHandler: HostUploadHandler;
  
  constructor(
    connection: EnhancedConnection,
  ) {
    this.connection = connection;
    this.requestHandler = new HostRequestHandler(this);
    this.uploadHandler = new HostUploadHandler(this);
    this.connection.getConnection().on('data', this.handleMessage.bind(this));
  }
  
  /**
   * Handle a message from a client
   */
  handleMessage(data: unknown) {
    // Check phase
    const phase = this.connection.getPhase();

    if (phase !== ConnectionPhase.ACTIVE) {
      console.warn(`Received message from non-active client ${this.connection.getClientId()}`);
      return;
    }

    this.handleActivePhaseMessage(data as WebRTCMessage);
  }

  /**
   * Send a response message
   * Used by the request handler
   */
  async sendResponse(message: WebRTCMessage) {
    this.connection.send(await this.serializeResponse(message));
  }
  
  /**
   * Handle messages during active phase
   */
  private async handleActivePhaseMessage(data: WebRTCMessage) {
    const { type, payload, requestId } = await this.connection.deserializeRequest(data);
    
    switch (type) {
      case MessageType.DIRECTORY_REQUEST:
        this.requestHandler.handleDirectoryRequest(payload, requestId);
        break;
      
      case MessageType.FILE_INFO_REQUEST:
        this.requestHandler.handleFileRequest(payload, requestId);
        break;
      
      case MessageType.FILE_TRANSFER_REQUEST:
        this.requestHandler.handleFileTransferRequest(payload, requestId);
        break;
      
      case MessageType.FILE_CHUNK_REQUEST:
        this.requestHandler.handleFileChunkRequest(payload, requestId);
        break;
        
      // 文件上传相关处理
      case MessageType.FILE_UPLOAD_REQUEST:
        this.uploadHandler.handleUploadRequest(payload, requestId!);
        break;
        
      case MessageType.FILE_UPLOAD_CHUNK:
        this.uploadHandler.handleUploadChunk(payload, requestId!);
        break;
        
      case MessageType.FILE_UPLOAD_CANCEL:
        this.uploadHandler.handleUploadCancel(payload, requestId!);
        break;
        
      default:
        console.warn(`Unexpected message type: ${type}`);
        this.sendError(requestId!, `Unsupported request type: ${type}`);
    }
  }

  private async serializeResponse(message: WebRTCMessage) {
    // 如果还没有密钥，则不加密
    if (!hostCrypto.hasKey()) {
      return message;
    }

    const encodedPlaintext = JSON.stringify(message);
    const { encrypted, iv } = await hostCrypto.encryptString(encodedPlaintext);
    const encryptedMessage = {
      type: MessageType.ENCRYPTED_RESPONSE,
      payload: { encrypted, iv }
    };
    return encryptedMessage as WebRTCMessage;
  }
  
  /**
   * Send error response
   */
  private sendError(requestId: string, error: string) {
    if (!requestId) return;
    
    const message = {
      type: MessageType.ERROR,
      payload: { error },
      requestId
    };
    
    this.connection.send(message as WebRTCMessage);
  }
} 