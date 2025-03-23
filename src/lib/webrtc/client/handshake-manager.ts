import { MessageType, MetaResponse, ErrorResponse } from '@/lib/webrtc';
import { v4 } from 'uuid';
import { clientCrypto } from '../crypto';
import { EnhancedConnection } from './enhanced-connection';
import { useDialogStore } from '@/store/dialogStore';
import { WebRTCMessage } from '@/lib/webrtc';

export type RequestId = string;

export interface PendingMetaRequest {
  resolve: (data: MetaResponse) => void;
  reject: (error: Error) => void;
}

export class HandshakeManager {
  private connection: EnhancedConnection;
  private pendingMetaRequest: Map<RequestId, PendingMetaRequest> = new Map();
  private timeoutDuration: number = 30000; // 30 seconds default timeout
  
  // Callbacks for handshake events
  private onHandshakeComplete: (meta: MetaResponse) => void;
  private onHandshakeFailed: (error: string) => void;
  private onHandshakeError: (error: string) => void;
  
  constructor(
    connection: EnhancedConnection,
    onHandshakeComplete: (meta: MetaResponse) => void,
    onHandshakeFailed: (error: string) => void,
    onHandshakeError: (error: string) => void,
    timeoutDuration?: number
  ) {
    this.connection = connection;
    this.onHandshakeComplete = onHandshakeComplete;
    this.onHandshakeFailed = onHandshakeFailed;
    this.onHandshakeError = onHandshakeError;
    if (timeoutDuration) {
      this.timeoutDuration = timeoutDuration;
    }
    this.connection.getConnection().on('data', this.handleMessage.bind(this));
  }

  async handleMessage(data: unknown) {
    const message = await this.connection.deserializeResponse(data as WebRTCMessage);
    // During handshake, we only care about META_RESPONSE and ERROR messages
    switch (message.type) {
      case MessageType.META_RESPONSE:
        this.handleMetaResponse(message.requestId!, message.payload);
        break;
        
      case MessageType.ERROR:
        this.handleErrorResponse(message.requestId!, message.payload);
        break;
        
      default:
        console.log('Ignored message during handshake phase:', message.type);
    }
  }
  
  /**
   * Handle meta response during handshake
   */
  private handleMetaResponse(requestId: string, payload: MetaResponse) {
    const request = this.pendingMetaRequest.get(requestId);
    if (request) {
      request.resolve(payload);
      this.pendingMetaRequest.delete(requestId);
    }
  }
  
  /**
   * Handle error response during handshake
   */
  private handleErrorResponse(requestId: string, payload: ErrorResponse) {
    const request = this.pendingMetaRequest.get(requestId);
    if (request) {
      request.reject(new Error(payload.error));
      this.pendingMetaRequest.delete(requestId);
    }
    this.onHandshakeFailed(payload.error);
  }
  
  /**
   * Clear all pending requests
   */
  clearRequests(error: string = '连接已关闭') {
    for (const [requestId, request] of this.pendingMetaRequest.entries()) {
      request.reject(new Error(error));
      this.pendingMetaRequest.delete(requestId);
    }
  }
  
  /**
   * Request meta information from host
   */
  private async requestMeta(): Promise<MetaResponse> {
    if (!this.connection) {
      throw new Error('未连接');
    }

    const requestId = v4();

    const requestPromise = new Promise<MetaResponse>((resolve, reject) => {
      const pendingRequest: PendingMetaRequest = {
        resolve,
        reject,
      };

      this.pendingMetaRequest.set(requestId, pendingRequest);
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingMetaRequest.has(requestId)) {
          this.pendingMetaRequest.delete(requestId);
          reject(new Error('请求超时'));
        }
      }, this.timeoutDuration);
    });

    let message = 'hello';
    if (clientCrypto.hasKey()) {
      const encrypted = await clientCrypto.encryptString(message);
      message = JSON.stringify(encrypted);
    }

    // Send the request
    const wrtcMessage = {
      type: MessageType.META_REQUEST,
      payload: { 
        message,
        platform: 'web',
        version: '1.0.0',
        apiVersion: '1',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      },
      requestId
    };

    this.connection.send(wrtcMessage as WebRTCMessage);
    return requestPromise;
  }
  
  /**
   * Start the handshake process
   * @returns true if handshake succeeded, false otherwise
   */
  async startHandshake(): Promise<boolean> {
    if (!this.connection) {
      this.onHandshakeError('未连接');
      return false;
    }
    
    try {
      let meta = await this.requestMeta();
      let passphrase = '';
      
      while (meta.message !== 'error') {
        if (meta.message === 'hello') {
          this.onHandshakeComplete(meta);
          return true;
        }
        
        if (meta.message === 'encrypted') {
          // Ask for passphrase
          passphrase = await this.askForPassphrase();
        }
        
        if (meta.message === 'mismatch') {
          // Password mismatch
          this.onHandshakeFailed('密码短语不匹配');
          passphrase = await this.askForPassphrase();
        }
        
        if (passphrase === '') {
          // User canceled passphrase input
          this.onHandshakeError('未提供密码，无法建立安全连接');
          return false;
        }
        
        await this.setEncryptionPassphrase(passphrase);
        meta = await this.requestMeta();
      }
      
      // Handshake failed
      this.onHandshakeError('握手失败');
      return false;
    } catch (error) {
      this.onHandshakeError(`握手错误: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Ask user for passphrase
   */
  private async askForPassphrase(): Promise<string> {
    const askForPassphrase = useDialogStore.getState().askForPassphrase;
    const passphrase = await askForPassphrase(
      '输入连接密码', 
      '请输入主机分享的密码以建立安全连接'
    );
    return passphrase;
  }
  
  /**
   * Set encryption passphrase
   */
  private async setEncryptionPassphrase(passphrase: string): Promise<boolean> {
    try {
      await clientCrypto.waitReady();
      await clientCrypto.setKeyFromPassphrase(passphrase);
      return true;
    } catch (error) {
      this.onHandshakeError(`无法设置加密密钥: ${error}`);
      return false;
    }
  }
}

export default HandshakeManager; 