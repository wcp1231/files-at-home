import { DataConnection } from 'peerjs';
import { ConnectionPhase } from './connection';
import { HandshakeManager } from './handshake-manager';
import { ClientMessageHandler } from './message-handler';
import { ClientRequestManager, FileTransfer, MetaResponse } from '@/lib/webrtc';
import { useFileBrowserStore } from '@/store/fileBrowserStore';
import { WebRTCMessage } from '@/lib/webrtc';
import { clientCrypto } from '../crypto';
import { MessageType } from '@/lib/webrtc';
import { deserializeMessage } from '../utils';

/**
 * Enhanced connection class that wraps the DataConnection with additional information
 */
export class EnhancedConnection {
  private connection: DataConnection;
  private requestManager: ClientRequestManager;
  private onActive: (clientId: string) => void;
  private onClose: (clientId: string) => void;
  private onError: (clientId: string, error: string) => void;
  private onTransferStatusChange: (transfer: FileTransfer) => void;
  private phase: ConnectionPhase = ConnectionPhase.DISCONNECTED;
  private messageHandler: ClientMessageHandler | undefined;
  private handshakeHandler: HandshakeManager | undefined;

  constructor(connection: DataConnection, onActive: (clientId: string) => void, onClose: (clientId: string) => void, onError: (clientId: string, error: string) => void, onTransferStatusChange: (transfer: FileTransfer) => void) {
    this.connection = connection;
    this.onActive = onActive;
    this.onClose = onClose;
    this.onError = onError;
    this.onTransferStatusChange = onTransferStatusChange;
    this.requestManager = new ClientRequestManager(this, 30000, () => {}, this.onTransferStatusChange);
    this.setupConnectionEvents();
  }

  requestFile(filePath: string) {
    return this.requestManager.requestFile(filePath) || null;
  }

  requestDirectory(path: string) {
    return this.requestManager.requestDirectory(path) || [];
  }

  cancelFileTransfer(fileId: string) {
    this.requestManager.cancelFileTransfer(fileId);
  }

  async sendRequest(message: WebRTCMessage) {
    const phase = this.getPhase();
    // Regular requests should only be sent in active phase
    if (phase !== ConnectionPhase.ACTIVE && message.type !== MessageType.META_REQUEST) {
      console.warn(`Attempted to send ${message.type} message while not in ACTIVE phase`);
      // Allow it to continue anyway, but log the warning
    }
    
    this.connection.send(await this.serializeRequest(message));
  }

  send(message: WebRTCMessage) {
    this.connection.send(message);
  }

  getPhase() {
    return this.phase;
  }

  getConnection() {
    return this.connection;
  }

  getRequestManager() {
    return this.requestManager;
  }

  disconnect() {
    this.connection.close();
    this.phase = ConnectionPhase.DISCONNECTED;
    this.onClose(this.getClientId());
    this.clearEncryptionKey();
  }

  /**
   * 检查是否设置了加密密钥
   */
  hasEncryptionKey(): boolean {
    return clientCrypto.hasKey();
  }
  
  /**
   * 清除加密密钥
   */
  clearEncryptionKey(): void {
    clientCrypto.clearKey();
  }

  async deserializeResponse(message: WebRTCMessage) {
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

  private async serializeRequest(message: WebRTCMessage) {
    // 如果还没有密钥，则不加密
    if (!clientCrypto.hasKey()) {
      return message;
    }

    const encodedPlaintext = JSON.stringify(message);
    const { encrypted, iv } = await clientCrypto.encryptString(encodedPlaintext);
    const encryptedMessage = {
      type: MessageType.ENCRYPTED_REQUEST,
      payload: { encrypted, iv }
    };
    return encryptedMessage;
  }

  private setupConnectionEvents() {
    // 设置连接事件
    this.connection.on('open', () => {
      console.log('Connection opened');
      this.setupHandshake();
    });
    
    this.connection.on('close', () => {
      this.phase = ConnectionPhase.DISCONNECTED;
      this.onClose(this.getClientId());
    });
    
    this.connection.on('error', (err) => {
      this.onError(this.getClientId(), err.message);
    });
  }

  private setupHandshake() {
    this.phase = ConnectionPhase.HANDSHAKING;
    this.handshakeHandler = new HandshakeManager(
      this,
      (meta: MetaResponse) => this.onHandshakeComplete(meta),
      (error: string) => this.onHandshakeFailed(error),
      (error: string) => this.onHandshakeError(error)
    );
    this.startHandshake();
  }

  private async startHandshake(): Promise<boolean> {
    console.log('Starting handshake...');
    if (!this.handshakeHandler) {
      return false;
    }
    const success = await this.handshakeHandler.startHandshake();
    if (!success) {
      this.disconnect();
    }
    return success;
  }

  private onHandshakeComplete(meta: MetaResponse) {
    console.log('Handshake complete:', meta);
    this.phase = ConnectionPhase.ACTIVE;
    // 临时在这里设置 features
    useFileBrowserStore.getState().setFeatures({
      showOperations: true,
      packable: meta.features.packable,
      writeable: meta.features.writeable,
    });
    this.startHandleMessage();
    this.onActive(this.getClientId());
  }

  // 处理握手失败，断开连接
  private onHandshakeFailed(error: string) {
    console.error('Handshake failed:', error);
    this.phase = ConnectionPhase.DISCONNECTED;
    this.onClose(this.getClientId());
  }

  // 处理握手错误，比如密码错误
  private onHandshakeError(error: string) {
    console.error('Handshake error:', error);
    this.onError(this.getClientId(), error);
  }

  private startHandleMessage() {
    this.messageHandler = new ClientMessageHandler(this, (error: string) => this.onError(this.getClientId(), error));
    this.messageHandler.startHandleMessage();
  }

  private getClientId(): string {
    return this.connection.peer;
  }
}