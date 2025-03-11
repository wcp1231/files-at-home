import { Peer, DataConnection } from 'peerjs';
import { ConnectionState, PeerRole, createPeer } from '@/lib/webrtc';
import { FSDirectory, FSEntry, FSFile } from "@/lib/filesystem";
import { HostMessageHandler } from './message-handler';
import { HostRequestHandler } from './request-handler';

export class HostConnectionManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private requestHandler: HostRequestHandler;
  private messageHandler: HostMessageHandler;
  
  // 状态回调函数
  private onStateChange: (state: ConnectionState) => void;
  private onError: (error: string) => void;
  private onConnectionIdGenerated: (id: string) => void;
  
  constructor(
    getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>,
    listFiles: (path: string) => Promise<FSEntry[] | null>,
    getFile: (filePath: string) => Promise<FSFile | null>,
    onStateChange: (state: ConnectionState) => void,
    onError: (error: string) => void,
    onConnectionIdGenerated: (id: string) => void
  ) {
    this.onStateChange = onStateChange;
    this.onError = onError;
    this.onConnectionIdGenerated = onConnectionIdGenerated;
    
    this.requestHandler = new HostRequestHandler(getDirectory, listFiles, getFile);
    this.messageHandler = new HostMessageHandler(this.requestHandler, this.onError);
  }
  
  async initializeHost() {
    try {
      this.onStateChange(ConnectionState.INITIALIZING);
      
      // 创建一个随机 ID 的 Peer
      const peer = createPeer('my-test-peer-host-id-1231');
      this.peer = peer;
      
      // 设置事件监听器
      peer.on('open', (id) => {
        console.log('Host peer ID:', id, peer.id);
        this.onStateChange(ConnectionState.WAITING_FOR_CONNECTION);
        // 使用 peer ID 作为连接 ID
        this.onConnectionIdGenerated(id);
      });
      
      peer.on('connection', (conn) => {
        console.log('Host received connection');
        this.setupConnection(conn);
      });
      
      this.setupPeerEvents(peer);
    } catch (err: any) {
      this.onError(`初始化错误: ${err.message}`);
      this.onStateChange(ConnectionState.ERROR);
    }
  }
  
  private setupConnection(conn: DataConnection) {
    this.connection = conn;
    
    // 设置连接事件
    conn.on('open', () => {
      console.log('Host connection opened');
      this.onStateChange(ConnectionState.CONNECTED);
    });
    
    conn.on('data', (data) => {
      this.messageHandler.handleMessage(conn, data as string);
    });
    
    conn.on('close', () => {
      console.log('Host connection closed');
      this.onStateChange(ConnectionState.DISCONNECTED);
      this.connection = null;
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
      console.log('Host peer disconnected');
      this.onStateChange(ConnectionState.DISCONNECTED);
      // 尝试重新连接
      peer.reconnect();
    });
    
    peer.on('close', () => {
      console.log('Host peer closed');
      this.onStateChange(ConnectionState.DISCONNECTED);
      this.peer = null;
      this.connection = null;
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

export default HostConnectionManager; 