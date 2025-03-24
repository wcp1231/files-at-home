import { Peer, DataConnection } from 'peerjs';
import { ConnectionState, createPeer, FileTransfer } from '@/lib/webrtc';
import { EnhancedConnection } from './enhanced-connection';
import { WorkerManager } from './worker';

// Define connection phases
export enum ConnectionPhase {
  DISCONNECTED,
  HANDSHAKING,
  ACTIVE
}

export class ClientConnectionManager {
  private peer: Peer | null = null;
  private enhancedConnection: EnhancedConnection | null = null;
  
  // 状态回调函数
  private onStateChangeHandler: (state: ConnectionState) => void;
  private onError: (error: string | null) => void;
  private onTransferStatusChange: (transfer: FileTransfer) => void;
  
  constructor(
    onStateChange: (state: ConnectionState) => void,
    onError: (error: string | null) => void,
    onTransferStatusChange?: (transfer: FileTransfer) => void
  ) {
    this.onStateChangeHandler = onStateChange;
    this.onError = onError;
    this.onTransferStatusChange = onTransferStatusChange || (() => {});
  }
  
  initializeClient(connectionId: string) {
    // 如果已经初始化，则不重复初始化
    if (this.peer) {
      this.connect(connectionId);
      return;
    }
    try {
      this.onStateChange(ConnectionState.INITIALIZING);
      
      // 创建一个Peer（不指定ID）
      const peer = createPeer();
      this.peer = peer;
      
      // 监听 open 事件
      peer.on('open', () => {
        // 连接到主机
        this.connect(connectionId);
      });
      
      this.setupPeerEvents(peer);
    } catch (err: unknown) {
      this.onError(`初始化错误: ${err instanceof Error ? err.message : String(err)}`);
      this.onStateChange(ConnectionState.ERROR);
    }
  }

  requestFile(filePath: string) {
    return this.enhancedConnection?.requestFile(filePath) || null;
  }

  requestDirectory(path: string) {
    return this.enhancedConnection?.requestDirectory(path) || [];
  }

  cancelFileTransfer(fileId: string) {
    this.enhancedConnection?.cancelFileTransfer(fileId);
  }

  private connect(connectionId: string) {
    // 连接到主机
    const conn = this.peer!.connect(connectionId, {
      reliable: true,
      serialization: "json"
    });
    this.setupConnection(conn);
  }
  
  private setupConnection(conn: DataConnection) {
    this.onStateChange(ConnectionState.CONNECTING);
    this.enhancedConnection = new EnhancedConnection(conn, 
      this.onConnectionActive.bind(this), 
      this.onConnectionClose.bind(this), 
      this.onConnectionError.bind(this), 
      this.onTransferStatusChange);
  }

  private onConnectionActive() {
    this.onStateChange(ConnectionState.CONNECTED);
  }

  private onConnectionClose() {
    this.onStateChange(ConnectionState.DISCONNECTED);
  }

  private onConnectionError(error: string) {
    // this.onStateChange(ConnectionState.ERROR);
    this.onError(`连接错误: ${error}`);
  }
  
  private setupPeerEvents(peer: Peer) {
    peer.on('error', (err) => {
      this.onError(`连接错误: ${err}`);
      this.onStateChange(ConnectionState.ERROR);
    });
    
    peer.on('disconnected', () => {
      this.onStateChange(ConnectionState.DISCONNECTED);
      // 尝试重新连接
      peer.reconnect();
    });
    
    peer.on('close', () => {
      this.onPeerClose()
    });
  }

  private onPeerClose() {    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }

  disconnect() {    
    this.onStateChange(ConnectionState.DISCONNECTED);
    this.enhancedConnection?.disconnect();
  }
  
  // 获取当前连接阶段
  getCurrentPhase(): ConnectionPhase {
    return this.enhancedConnection?.getPhase() || ConnectionPhase.DISCONNECTED;
  }
  
  // 获取当前 Peer
  getPeer() {
    return this.peer;
  }

  getConnection() {
    return this.enhancedConnection;
  }

  /**
   * 检查是否设置了加密密钥
   */
  hasEncryptionKey(): boolean {
    return this.enhancedConnection?.hasEncryptionKey() || false;
  }
  
  /**
   * 清除加密密钥
   */
  clearEncryptionKey(): void {
    this.enhancedConnection?.clearEncryptionKey();
  }

  private onStateChange(state: ConnectionState) {
    this.onStateChangeHandler(state);
    WorkerManager.onWebRTCStateChange(state);
  }
}

export default ClientConnectionManager; 