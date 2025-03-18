import { Peer, DataConnection } from 'peerjs';
import { ConnectionState, createPeer, WebRTCMessage } from '@/lib/webrtc';
import { HostRequestHandler } from './request-handler';
import { HostMessageHandler } from './message-handler';
import { HostHandshakeHandler } from './handshake-handler';
import { FSDirectory, FSEntry, FSFile } from "@/lib/filesystem";
import { hostCrypto } from '../crypto';

// Define connection phases for host-side
export enum ConnectionPhase {
  DISCONNECTED = 0,
  HANDSHAKING = 1,
  ACTIVE = 2
}

export interface HostConnectionCallbacks {
  onClientConnected?: (clientId: string) => void;
  onClientDisconnected?: (clientId: string) => void;
  onStateChanged?: (state: ConnectionState) => void;
  onEncryptionPassphraseGenerated?: (passphrase: string | null) => void;
  onError?: (error: string | null) => void;
}

export class HostConnectionManager {
  private peer: Peer | null = null;
  private peerId: string = '';
  private connections: Map<string, DataConnection> = new Map();
  private requestHandler: HostRequestHandler;
  private messageHandler: HostMessageHandler;
  private callbacks: HostConnectionCallbacks;
  private encryptionPassphrase: string | null = null;
  // Track connection phase per client
  private clientPhases: Map<string, ConnectionPhase> = new Map();
  
  constructor(
    getDirectory: (path: string, recursive: boolean) => Promise<FSDirectory | null>,
    listFiles: (path: string) => Promise<FSEntry[] | null>,
    getFile: (filePath: string) => Promise<FSFile | null>,
    callbacks: HostConnectionCallbacks = {}
  ) {
    this.requestHandler = new HostRequestHandler(getDirectory, listFiles, getFile);
    this.messageHandler = new HostMessageHandler(
      this,
      this.requestHandler,
      (clientId: string, phase: ConnectionPhase) => this.setClientPhase(clientId, phase)
    );
    this.callbacks = callbacks;
  }

  // 获取当前连接的客户端 ID 列表
  getConnectedClients(): string[] {
    return Array.from(this.connections.keys());
  }

  // 获取客户端的连接阶段
  getClientPhase(clientId: string): ConnectionPhase {
    return this.clientPhases.get(clientId) || ConnectionPhase.DISCONNECTED;
  }

  // 设置客户端的连接阶段
  private setClientPhase(clientId: string, phase: ConnectionPhase) {
    console.log(`Setting client ${clientId} phase to ${ConnectionPhase[phase]}`);
    this.clientPhases.set(clientId, phase);
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
  disconnect() {
    // 关闭所有连接
    for (const connection of this.connections.values()) {
      connection.close();
    }
    this.connections.clear();
    this.clientPhases.clear();
    
    // 关闭 Peer
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.callbacks.onStateChanged!(ConnectionState.DISCONNECTED);
  }

  // 断开指定客户端连接
  disconnectClient(clientId: string) {
    const connection = this.connections.get(clientId);
    if (connection) {
      connection.close();
      this.connections.delete(clientId);
      this.clientPhases.delete(clientId);
      
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
      this.handleNewConnection(connection);
    });

    this.peer.on('error', (error) => {
      if (this.callbacks.onError) {
        this.callbacks.onError(`Peer 错误: ${error.message}`);
      }
    });
  }

  // 处理新的连接
  private handleNewConnection(connection: DataConnection) {
    const clientId = connection.peer;
    
    // 设置初始阶段为握手阶段
    this.callbacks.onStateChanged!(ConnectionState.HANDSHAKING);
    this.setClientPhase(clientId, ConnectionPhase.HANDSHAKING);
    
    // 保存连接
    this.connections.set(clientId, connection);
    
    // 创建握手处理器
    const handshakeHandler = new HostHandshakeHandler(
      connection,
      () => this.onHandshakeComplete(clientId),
      (error) => this.onHandshakeFailed(clientId, error)
    );
    
    // 设置握手处理器
    this.messageHandler.setHandshakeHandler(clientId, handshakeHandler);
    
    // 设置连接事件
    this.setupConnectionEvents(connection);
    
    // 通知客户端连接
    if (this.callbacks.onClientConnected) {
      this.callbacks.onClientConnected(clientId);
    }
  }

  // 处理握手成功
  private onHandshakeComplete(clientId: string) {
    console.log(`Handshake completed for client ${clientId}`);
    this.setClientPhase(clientId, ConnectionPhase.ACTIVE);
    this.callbacks.onStateChanged!(ConnectionState.CONNECTED);
  }

  // 处理握手失败
  private onHandshakeFailed(clientId: string, error: string) {
    console.error(`Handshake failed for client ${clientId}: ${error}`);
    this.disconnectClient(clientId);
    this.callbacks.onStateChanged!(ConnectionState.WAITING_FOR_CONNECTION);
  }

  // 设置连接事件
  private setupConnectionEvents(connection: DataConnection) {
    const clientId = connection.peer;

    connection.on('data', (data) => {
      this.messageHandler.handleMessage(clientId, connection, data as WebRTCMessage);
    });

    connection.on('close', () => {
      this.connections.delete(clientId);
      this.clientPhases.delete(clientId);

      this.callbacks.onStateChanged!(ConnectionState.WAITING_FOR_CONNECTION);
      if (this.callbacks.onClientDisconnected) {
        this.callbacks.onClientDisconnected(clientId);
      }
    });

    connection.on('error', (error) => {
      if (this.callbacks.onError) {
        this.callbacks.onError(`连接错误: ${error.message}`);
      }
    });
  }
}

export default HostConnectionManager; 