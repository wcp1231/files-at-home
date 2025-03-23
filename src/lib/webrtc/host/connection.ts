import { Peer, DataConnection } from 'peerjs';
import { ConnectionState, createPeer } from '@/lib/webrtc';
import { HostRequestHandler } from './request-handler';
import { FSDirectory, FSEntry, FSFile } from "@/lib/filesystem";
import { hostCrypto } from '../crypto';
import { EnhancedConnection, ClientConnectionInfo } from './enhanced-connection';

// Define connection phases for host-side
export enum ConnectionPhase {
  DISCONNECTED = 0,
  HANDSHAKING = 1,
  ACTIVE = 2
}

export interface HostConnectionCallbacks {
  onClientConnected?: (clientId: string) => void;
  onClientActivated?: (clientId: string) => void;
  onClientDisconnected?: (clientId: string) => void;
  onStateChanged?: (state: ConnectionState) => void;
  onEncryptionPassphraseGenerated?: (passphrase: string | null) => void;
  onError?: (error: string | null) => void;
}

export class HostConnectionManager {
  private peer: Peer | null = null;
  private peerId: string = '';
  private connections: Map<string, EnhancedConnection> = new Map();
  private callbacks: HostConnectionCallbacks;
  private encryptionPassphrase: string | null = null;
  
  constructor(
    getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>,
    listFiles: (path: string) => Promise<FSEntry[] | null>,
    getFile: (filePath: string) => Promise<FSFile | null>,
    callbacks: HostConnectionCallbacks = {}
  ) {
    HostRequestHandler.setFileSystem({
      getDirectory,
      listFiles,
      getFile
    });
    this.callbacks = callbacks;
  }

  // 获取当前连接的客户端 ID 列表
  getConnectedClients(): string[] {
    return Array.from(this.connections.values()).map(conn => conn.getClientId());
  }

  // 获取客户端连接信息
  getClientInfo(clientId: string): ClientConnectionInfo | null {
    const connection = this.connections.get(clientId);
    if (connection) {
      return connection.getConnectionInfo();
    }
    return null;
  }

  // 获取所有客户端连接信息
  getAllClientInfo(): ClientConnectionInfo[] {
    const result: ClientConnectionInfo[] = [];
    for (const connection of this.connections.values()) {
      result.push(connection.getConnectionInfo());
    }
    return result;
  }

  // 作为服务器启动
  async initializeHost(peerId: string, passphrase: string): Promise<string> {
    try {
      if (passphrase) {
        await hostCrypto.waitReady();
        this.encryptionPassphrase = await hostCrypto.generateKeyFromPassphrase(passphrase);
        this.callbacks.onEncryptionPassphraseGenerated!(this.encryptionPassphrase);
      } else {
        hostCrypto.clearKey();
        this.encryptionPassphrase = null;
        this.callbacks.onEncryptionPassphraseGenerated!(this.encryptionPassphrase);
      }

      this.peer = await createPeer(peerId);
      this.setupPeerEvents();
      this.peerId = this.peer.id;
      return this.peerId;
    } catch (error) {
      if (this.callbacks.onError) {
        this.callbacks.onError(`启动服务器失败: ${error instanceof Error ? error.message : String(error)}`);
      }
      throw error;
    }
  }

  // 断开所有连接
  disconnectAll(): void {
    // 关闭所有连接
    for (const connection of this.connections.values()) {
      connection.close();
    }
    this.connections.clear();
  }

  // 断开指定客户端连接
  disconnectClient(clientId: string): void {
    const connection = this.connections.get(clientId);
    if (connection) {
      connection.close();
      this.connections.delete(clientId);
      if (this.callbacks.onClientDisconnected) {
        this.callbacks.onClientDisconnected(clientId);
      }
    }
  }

  // 设置 Peer 事件
  private setupPeerEvents() {
    if (!this.peer) return;

    this.peer.on('open', (id) => {
      this.peerId = id;
      this.callbacks.onStateChanged!(ConnectionState.WAITING_FOR_CONNECTION);
    });

    this.peer.on('connection', (connection) => {
      this.handleConnection(connection);
    });

    this.peer.on('error', (error) => {
      if (this.callbacks.onError) {
        this.callbacks.onError(`Peer 错误: ${error.message}`);
      }
    });
  }

  // 处理新连接
  private handleConnection(conn: DataConnection): void {
    // 创建增强的连接对象
    const enhancedConn = new EnhancedConnection(conn,
      (clientId) => this.onConnectionClose(clientId),
      (clientId, error) => this.onConnectionError(clientId, error),
      (clientId) => this.onHandshakeComplete(clientId),
      (clientId, error) => this.onHandshakeFailed(clientId, error)
    );
    
    // 存储连接
    this.connections.set(conn.peer, enhancedConn);
    
    // TODO 握手成功后才通知？
    // 通知客户端连接
    if (this.callbacks.onClientConnected) {
      this.callbacks.onClientConnected(enhancedConn.getClientId());
    }
  }

  // 处理握手成功
  private onHandshakeComplete(clientId: string): void {
    console.log(`Handshake completed for client ${clientId}`);
    
    // 更新连接状态
    // TODO 判断数量
    this.callbacks.onStateChanged!(ConnectionState.CONNECTED);
    
    // 通知客户端激活
    if (this.callbacks.onClientActivated) {
      this.callbacks.onClientActivated(clientId);
    }
    
    // 清除错误
    if (this.callbacks.onError) {
      this.callbacks.onError(null);
    }
  }
  
  // 处理握手失败
  private onHandshakeFailed(clientId: string, error: string): void {
    console.error(`Handshake failed for client ${clientId}: ${error}`);
    
    // 移除连接
    this.connections.delete(clientId);
    
    // 更新连接状态
    this.callbacks.onStateChanged!(ConnectionState.WAITING_FOR_CONNECTION);
    
    // 报告错误
    if (this.callbacks.onError) {
      this.callbacks.onError(`握手失败: ${error}`);
    }
    
    // 通知客户端断开连接
    if (this.callbacks.onClientDisconnected) {
      this.callbacks.onClientDisconnected(clientId);
    }
  }

  private onConnectionClose(clientId: string) {
    this.connections.delete(clientId);
    if (this.callbacks.onClientDisconnected) {
      this.callbacks.onClientDisconnected(clientId);
    }
  }

  private onConnectionError(clientId: string, error: string) {
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }
}

export default HostConnectionManager;