import { Peer, DataConnection } from 'peerjs';
import { ConnectionState, createPeer, FileTransfer } from '@/lib/webrtc';
import { ClientMessageHandler } from './message-handler';
import { ClientRequestManager } from './request-manager';
import { WorkerManager } from './worker';
import { clientCrypto } from '@/lib/webrtc/crypto';
import { useDialogStore } from '@/store/dialogStore';

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
    } catch (err: unknown) {
      this.onError(`初始化错误: ${err instanceof Error ? err.message : String(err)}`);
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
      this.onStateChange(ConnectionState.HANDSHAKING);
      this.handshake();
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

  /**
   * 发送握手请求
   * 判断是否需要加密以及其他高级功能
   */
  async handshake() {
    let meta = await this.requestManager.requestMeta();
    let passphrase = '';
    while (meta.message !== 'error') {
      if (meta.message === 'hello') {
        // 完成握手
        this.onStateChange(ConnectionState.CONNECTED);
        // TODO 根据 meta 中的 features 设置请求管理器
        console.log('握手成功');
        return
      }
      if (meta.message === 'encrypted') {
        // 询问用户输入密码短语
        passphrase = await this.askForPassphrase();
        meta = await this.requestManager.requestMeta();
      }
      if (meta.message === 'mismatch') {
        // 密码短语不匹配
        this.onError('密码短语不匹配');
        passphrase = await this.askForPassphrase();
        meta = await this.requestManager.requestMeta();
      }
      if (passphrase === '') {
        // 用户取消了输入
        this.onError('未提供密码，无法建立安全连接');
        this.onStateChange(ConnectionState.DISCONNECTED);
        return;
      }
      await this.setEncryptionPassphrase(passphrase);
      meta = await this.requestManager.requestMeta();
    }
    // 握手失败
    this.onError('握手失败');
    this.onStateChange(ConnectionState.ERROR);
    // 断开连接
    this.disconnect();
  }

  /**
   * 询问用户输入密码短语
   * @returns 返回用户输入的密码，若用户取消则返回null
   */
  async askForPassphrase(): Promise<string> {
    // 获取 store 中的方法（这里我们访问的是 store 的静态方法，不在组件内）
    const askForPassphrase = useDialogStore.getState().askForPassphrase;
    const passphrase = await askForPassphrase(
      '输入连接密码', 
      '请输入主机分享的密码以建立安全连接'
    );
    return passphrase;
  }
  
  /**
   * 设置加密密码短语
   * @param passphrase 用户输入的密码短语
   */
  async setEncryptionPassphrase(passphrase: string): Promise<boolean> {
    try {
      await clientCrypto.waitReady();
      await clientCrypto.setKeyFromPassphrase(passphrase);
      return true;
    } catch (error) {
      console.error('设置加密密钥失败:', error);
      this.onError(`无法设置加密密钥: ${error}`);
      return false;
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

  private async workerMessageHandler(path: string, writable: WritableStream<Uint8Array>, start?: number, end?: number) {
    await this.requestManager.workerMessageHandler(path, writable, start, end);
  }
}

export default ClientConnectionManager; 