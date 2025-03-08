import { Peer, DataConnection } from 'peerjs';
import { ConnectionState, PeerRole, createPeer, FileTransfer } from '@/lib/webrtc';
import { ClientMessageHandler } from './message-handler';
import { ClientRequestManager } from './request-manager';
import { WorkerManager } from './worker';

export class ClientConnectionManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private requestManager: ClientRequestManager;
  private messageHandler: ClientMessageHandler;
  
  // 状态回调函数
  private onStateChangeHandler: (state: ConnectionState) => void;
  private onError: (error: string) => void;
  private onTransferStatusChange: (transfer: FileTransfer) => void;
  
  constructor(
    onStateChange: (state: ConnectionState) => void,
    onError: (error: string) => void,
    onTransferStatusChange?: (transfer: FileTransfer) => void
  ) {
    this.onStateChangeHandler = onStateChange;
    this.onError = onError;
    this.onTransferStatusChange = onTransferStatusChange || (() => {});
    
    this.requestManager = new ClientRequestManager(
      null, 
      30000, 
      () => {}, // 进度回调会在请求管理器中直接设置
      this.onTransferStatusChange
    );
    this.messageHandler = new ClientMessageHandler(this.requestManager, this.onError);
    WorkerManager.setMessageHandler(this.workerMessageHandler.bind(this));
  }
  
  initializeClient(connectionId: string) {
    try {
      this.onStateChange(ConnectionState.INITIALIZING);
      
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
    } catch (err: any) {
      this.onError(`初始化错误: ${err.message}`);
      this.onStateChange(ConnectionState.ERROR);
    }
  }
  
  private setupConnection(conn: DataConnection) {
    this.onStateChange(ConnectionState.CONNECTING);
    this.connection = conn;
    this.requestManager.setConnection(conn);
    
    // 设置连接事件
    conn.on('open', () => {
      console.log('Client connection opened');
      this.onStateChange(ConnectionState.CONNECTED);
    });
    
    conn.on('data', (data) => {
      this.messageHandler.handleMessage(conn, data as string);
    });
    
    conn.on('close', () => {
      console.log('Client connection closed');
      this.onStateChange(ConnectionState.DISCONNECTED);
      this.connection = null;
      this.requestManager.setConnection(null);
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
      // 尝试重新连接
      peer.reconnect();
    });
    
    peer.on('close', () => {
      console.log('Client peer closed');
      this.onStateChange(ConnectionState.DISCONNECTED);
      this.peer = null;
      this.connection = null;
      this.requestManager.setConnection(null);
    });
  }

  private onStateChange(state: ConnectionState) {
    this.onStateChangeHandler(state);
    WorkerManager.onWebRTCStateChange(state);
  }

  private async workerMessageHandler(path: string, writable: WritableStream<Uint8Array>) {
    await this.requestManager.workerMessageHandler(path, writable);
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
    
    this.onStateChange(ConnectionState.DISCONNECTED);
    this.requestManager.setConnection(null);
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
}

export default ClientConnectionManager; 