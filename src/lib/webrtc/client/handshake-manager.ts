import { DataConnection } from 'peerjs';
import { MessageType, MetaResponse, ConnectionState, ErrorResponse } from '@/lib/webrtc';
import { v4 } from 'uuid';
import { clientCrypto } from '../crypto';
import { useDialogStore } from '@/store/dialogStore';
import { ConnectionPhase } from './connection';
import { useFileBrowserStore } from '@/store/fileBrowserStore';

export type RequestId = string;

export interface PendingMetaRequest {
  resolve: (data: MetaResponse) => void;
  reject: (error: Error) => void;
}

export class HandshakeManager {
  private connection: DataConnection | null = null;
  private pendingMetaRequest: Map<RequestId, PendingMetaRequest> = new Map();
  private timeoutDuration: number = 30000; // 30 seconds default timeout
  
  // Callbacks
  private onPhaseChange: (phase: ConnectionPhase) => void;
  private onStateChange: (state: ConnectionState) => void;
  private onError: (error: string | null) => void;
  
  constructor(
    onPhaseChange: (phase: ConnectionPhase) => void,
    onStateChange: (state: ConnectionState) => void,
    onError: (error: string | null) => void,
    timeoutDuration?: number
  ) {
    this.onPhaseChange = onPhaseChange;
    this.onStateChange = onStateChange;
    this.onError = onError;
    if (timeoutDuration) {
      this.timeoutDuration = timeoutDuration;
    }
  }
  
  /**
   * Set the connection object
   */
  setConnection(connection: DataConnection | null) {
    this.connection = connection;
  }
  
  /**
   * Handle meta response during handshake
   */
  handleMetaResponse(requestId: string, payload: MetaResponse) {
    const request = this.pendingMetaRequest.get(requestId);
    if (request) {
      request.resolve(payload);
      this.pendingMetaRequest.delete(requestId);
    }
  }
  
  /**
   * Handle error response during handshake
   */
  handleErrorResponse(requestId: string, payload: ErrorResponse) {
    const request = this.pendingMetaRequest.get(requestId);
    if (request) {
      request.reject(new Error(payload.error));
      this.pendingMetaRequest.delete(requestId);
    }
    this.onError(payload.error);
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
  async requestMeta(): Promise<MetaResponse> {
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
      payload: { message },
      requestId
    };

    this.connection!.send(JSON.stringify(wrtcMessage));
    return requestPromise;
  }
  
  /**
   * Start the handshake process
   * @returns true if handshake succeeded, false otherwise
   */
  async startHandshake(): Promise<boolean> {
    if (!this.connection) {
      this.onError('未连接');
      return false;
    }
    
    try {
      let meta = await this.requestMeta();
      let passphrase = '';
      
      while (meta.message !== 'error') {
        if (meta.message === 'hello') {
          this.onHandshakeCompleted(meta);
          return true;
        }
        
        if (meta.message === 'encrypted') {
          // Ask for passphrase
          passphrase = await this.askForPassphrase();
        }
        
        if (meta.message === 'mismatch') {
          // Password mismatch
          this.onError('密码短语不匹配');
          passphrase = await this.askForPassphrase();
        }
        
        if (passphrase === '') {
          // User canceled passphrase input
          this.onError('未提供密码，无法建立安全连接');
          this.onStateChange(ConnectionState.DISCONNECTED);
          this.onPhaseChange(ConnectionPhase.DISCONNECTED);
          return false;
        }
        
        await this.setEncryptionPassphrase(passphrase);
        meta = await this.requestMeta();
      }
      
      // Handshake failed
      this.onError('握手失败');
      this.onStateChange(ConnectionState.ERROR);
      this.onPhaseChange(ConnectionPhase.DISCONNECTED);
      return false;
    } catch (error) {
      this.onError(`握手错误: ${error instanceof Error ? error.message : String(error)}`);
      this.onStateChange(ConnectionState.ERROR);
      this.onPhaseChange(ConnectionPhase.DISCONNECTED);
      return false;
    }
  }

  private onHandshakeCompleted(meta: MetaResponse) {
    const features = meta.features;
    // 临时在这里设置 features
    useFileBrowserStore.getState().setFeatures({
      showOperations: true,
      packable: features.packable,
      writeable: features.writeable,
    });

    this.onPhaseChange(ConnectionPhase.ACTIVE);
    this.onStateChange(ConnectionState.CONNECTED);
    this.onError(null);
    console.log('Handshake completed, now in ACTIVE phase');
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
      this.onError(`无法设置加密密钥: ${error}`);
      return false;
    }
  }
}

export default HandshakeManager; 