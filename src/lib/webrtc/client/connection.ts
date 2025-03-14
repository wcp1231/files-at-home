import { Peer, DataConnection } from 'peerjs';
import { ConnectionState, createPeer, FileTransfer } from '@/lib/webrtc';
import { ClientMessageHandler } from './message-handler';
import { ClientRequestManager } from './request-manager';
import { HandshakeManager } from './handshake-manager';
import { WorkerManager } from './worker';
import { clientCrypto } from '@/lib/webrtc/crypto';

// Define connection phases
export enum ConnectionPhase {
  DISCONNECTED,
  HANDSHAKING,
  ACTIVE
}

export class ClientConnectionManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private requestManager: ClientRequestManager;
  private messageHandler: ClientMessageHandler;
  private handshakeManager: HandshakeManager;
  
  // Connection phase tracking
  private connectionPhase: ConnectionPhase = ConnectionPhase.DISCONNECTED;
  
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
    
    // Initialize managers
    this.requestManager = new ClientRequestManager(
      null, 
      30000, 
      () => {}, // 进度回调会在请求管理器中直接设置
      this.onTransferStatusChange
    );
    this.handshakeManager = new HandshakeManager(
      this.setConnectionPhase.bind(this),
      this.onStateChange.bind(this),
      this.onError,
      30000
    );

    this.messageHandler = new ClientMessageHandler(this.requestManager, this.handshakeManager, this.onError);
    
    // Set relationship between managers
    this.messageHandler.setHandshakeManager(this.handshakeManager);
    
    // 初始化设置阶段
    this.setConnectionPhase(this.connectionPhase);
  }
  
  initializeClient(connectionId: string) {
    try {
      this.onStateChange(ConnectionState.INITIALIZING);
      this.setConnectionPhase(ConnectionPhase.DISCONNECTED);
      
      // 创建一个Peer（不指定ID）
      const peer = createPeer();
      this.peer = peer;
      
      // 监听 open 事件
      peer.on('open', () => {
        console.log('Client peer opened');
        
        // 连接到主机
        const conn = peer.connect(connectionId, {
          reliable: true
        });
        this.setupConnection(conn);
      });
      
      this.setupPeerEvents(peer);
    } catch (err: unknown) {
      this.onError(`初始化错误: ${err instanceof Error ? err.message : String(err)}`);
      this.onStateChange(ConnectionState.ERROR);
    }
  }
  
  private setupConnection(conn: DataConnection) {
    this.onStateChange(ConnectionState.CONNECTING);
    this.connection = conn;
    this.requestManager.setConnection(conn);
    this.handshakeManager.setConnection(conn);
    
    // 设置连接事件
    conn.on('open', () => {
      console.log('Client connection opened');
      this.onStateChange(ConnectionState.HANDSHAKING);
      this.setConnectionPhase(ConnectionPhase.HANDSHAKING);
      this.startHandshake();
    });
    
    conn.on('data', (data) => {
      // Pass the connection phase to handle the message according to the current phase
      this.messageHandler.handleMessage(conn, data as string);
    });
    
    conn.on('close', () => {
      console.log('Client connection closed');
      this.onStateChange(ConnectionState.DISCONNECTED);
      this.setConnectionPhase(ConnectionPhase.DISCONNECTED);
      this.connection = null;
      this.requestManager.setConnection(null);
      this.handshakeManager.setConnection(null);
    });
    
    conn.on('error', (err) => {
      console.error('Connection error:', err);
      this.onError(`连接错误: ${err}`);
      this.onStateChange(ConnectionState.ERROR);
    });
  }
  
  private setupPeerEvents(peer: Peer) {
    peer.on('error', (err) => {
      console.error('Peer error:', err);
      this.onError(`连接错误: ${err}`);
      this.onStateChange(ConnectionState.ERROR);
    });
    
    peer.on('disconnected', () => {
      console.log('Client peer disconnected');
      this.onStateChange(ConnectionState.DISCONNECTED);
      this.setConnectionPhase(ConnectionPhase.DISCONNECTED);
      // 尝试重新连接
      peer.reconnect();
    });
    
    peer.on('close', () => {
      console.log('Client peer closed');
      this.onStateChange(ConnectionState.DISCONNECTED);
      this.setConnectionPhase(ConnectionPhase.DISCONNECTED);
      this.peer = null;
      this.connection = null;
      this.requestManager.setConnection(null);
      this.handshakeManager.setConnection(null);
    });
  }

  disconnect() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    this.setConnectionPhase(ConnectionPhase.DISCONNECTED);
    this.onStateChange(ConnectionState.DISCONNECTED);
    this.requestManager.setConnection(null);
    this.handshakeManager.setConnection(null);
  }
  
  // Helper method to change connection phase and update dependencies
  private setConnectionPhase(phase: ConnectionPhase) {
    if (this.connectionPhase === phase) return;
    
    console.log(`Connection phase changing from ${ConnectionPhase[this.connectionPhase]} to ${ConnectionPhase[phase]}`);
    this.connectionPhase = phase;
    
    // Update related components
    this.messageHandler.setPhase(phase);
    this.requestManager.setPhase(phase);
  }
  
  // 获取当前连接阶段
  getCurrentPhase(): ConnectionPhase {
    return this.connectionPhase;
  }
  
  // 暴露 RequestManager 的方法以供外部调用
  getRequestManager() {
    return this.requestManager;
  }
  
  // 获取当前连接
  getConnection() {
    return this.connection;
  }
  
  // 获取当前 Peer
  getPeer() {
    return this.peer;
  }

  /**
   * 启动握手过程
   */
  private async startHandshake() {
    if (!this.connection) {
      this.onError('未连接，无法进行握手');
      return;
    }
    
    const success = await this.handshakeManager.startHandshake();
    if (!success) {
      // If handshake failed, disconnect
      this.disconnect();
    }
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

  private onStateChange(state: ConnectionState) {
    this.onStateChangeHandler(state);
    WorkerManager.onWebRTCStateChange(state);
  }
}

export default ClientConnectionManager; 