import { DataConnection } from 'peerjs';
import { ConnectionPhase } from './connection';
import { MessageType, MetaRequest, WebRTCMessage } from '../types';
import { HostMessageHandler } from './message-handler';
import { HostHandshakeHandler } from './handshake-handler';
import { hostCrypto } from '../crypto';
import { deserializeMessage } from '../utils';

// Browser types enum
export enum ClientBrowserType {
  CHROME = 'Chrome',
  FIREFOX = 'Firefox',
  SAFARI = 'Safari',
  EDGE = 'Edge',
  OPERA = 'Opera',
  UNKNOWN = 'Unknown'
}

// System types enum
export enum ClientSystemType {
  WINDOWS = 'Windows',
  MACOS = 'macOS',
  LINUX = 'Linux',
  ANDROID = 'Android',
  IOS = 'iOS',
  UNKNOWN = 'Unknown'
}

/**
 * Enhanced connection class that wraps the DataConnection with additional information
 */
export class EnhancedConnection {
  private connection: DataConnection;
  private onClose: (clientId: string) => void;
  private onError: (clientId: string, error: string) => void;
  private _onHandshakeComplete: (clientId: string) => void;
  private _onHandshakeFailed: (clientId: string, error: string) => void;
  private phase: ConnectionPhase = ConnectionPhase.HANDSHAKING;
  private connectionTime: Date = new Date();
  private browserType: ClientBrowserType = ClientBrowserType.UNKNOWN;
  private browserVersion: string = '';
  private systemType: ClientSystemType = ClientSystemType.UNKNOWN;
  private userAgent: string = '';
  private messageHandler: HostMessageHandler | undefined;
  private handshakeHandler: HostHandshakeHandler | undefined;

  constructor(connection: DataConnection,
    onClose: (clientId: string) => void, onError: (clientId: string, error: string) => void,
    onHandshakeComplete: (clientId: string) => void, onHandshakeFailed: (clientId: string, error: string) => void) {
    this.connection = connection;
    this.onClose = onClose;
    this.onError = onError;
    this._onHandshakeComplete = onHandshakeComplete;
    this._onHandshakeFailed = onHandshakeFailed;
    this.setupConnectionEvents();
    this.startHandshake();
  }

  /**
   * Get the underlying DataConnection
   */
  getConnection(): DataConnection {
    return this.connection;
  }

  /**
   * Get the client ID
   */
  getClientId(): string {
    return this.connection.peer;
  }

  /**
   * Set the connection phase
   */
  setPhase(phase: ConnectionPhase): void {
    this.phase = phase;
  }

  /**
   * Get the connection phase
   */
  getPhase(): ConnectionPhase {
    return this.phase;
  }

  /**
   * Set the meta information from the client
   */
  setMetaInfo(meta: MetaRequest): void {
    if (meta.userAgent) {
      this.userAgent = meta.userAgent;
      this.parseUserAgent(meta.userAgent);
    }
  }

  send(message: WebRTCMessage) {
    this.connection.send(message);
  }

  close() {
    this.connection.close();
    this.onClose(this.getClientId());
  }

  /**
   * Get browser type
   */
  getBrowserType(): ClientBrowserType {
    return this.browserType;
  }

  /**
   * Get browser version
   */
  getBrowserVersion(): string {
    return this.browserVersion;
  }

  /**
   * Get system type
   */
  getSystemType(): ClientSystemType {
    return this.systemType;
  }

  /**
   * Get user agent
   */
  getUserAgent(): string {
    return this.userAgent;
  }

  /**
   * Get connection time
   */
  getConnectionTime(): Date {
    return this.connectionTime;
  }

  /**
   * Get the connection information
   */
  getConnectionInfo(): ClientConnectionInfo {
    return {
      clientId: this.getClientId(),
      phase: this.phase,
      connectionTime: this.connectionTime,
      systemType: this.systemType,
      browserType: this.browserType,
      browserVersion: this.browserVersion
    };
  }

  async deserializeRequest(message: WebRTCMessage) {
    if (message.type === MessageType.ERROR) {
      return message
    }

    if (message.type === MessageType.ENCRYPTED_REQUEST) {
      const { encrypted, iv } = message.payload;
      const decryptedData = await hostCrypto.decryptString(encrypted, iv);
      return deserializeMessage(decryptedData);
    }

    return message;
  }

  /**
   * Start the handshake process
   */
  private startHandshake(): void {
    this.setPhase(ConnectionPhase.HANDSHAKING);
    // Create handshake handler using the existing HostHandshakeHandler
    this.handshakeHandler = new HostHandshakeHandler(
      this,
      () => this.onHandshakeComplete(),
      (error: string) => this.onHandshakeFailed(error)
    );
  }

  private onHandshakeComplete() {
    this.setPhase(ConnectionPhase.ACTIVE);
    this.startHandleMessage();
    this._onHandshakeComplete(this.getClientId());
  }

  private onHandshakeFailed(error: string) {
    this.setPhase(ConnectionPhase.DISCONNECTED);
    this._onHandshakeFailed(this.getClientId(), error);
  }

  private startHandleMessage() {
    this.messageHandler = new HostMessageHandler(this);
  }

  // 设置基础连接事件
  private setupConnectionEvents() {
    this.connection.on('close', () => {
      this.onClose(this.getClientId());
    });

    this.connection.on('error', (error) => {
      console.error(`Connection error for client ${this.getClientId()}:`, error);
      this.onError(this.getClientId(), error.message);
    });
  }

  /**
   * Parse the user agent string to determine browser and system information
   */
  private parseUserAgent(userAgent: string): void {
    console.log('User Agent:', userAgent);
    // Detect browser type and version
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      this.browserType = ClientBrowserType.CHROME;
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      if (match) {
        this.browserVersion = match[1];
      }
    } else if (userAgent.includes('Firefox')) {
      this.browserType = ClientBrowserType.FIREFOX;
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      if (match) {
        this.browserVersion = match[1];
      }
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      this.browserType = ClientBrowserType.SAFARI;
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      if (match) {
        this.browserVersion = match[1];
      }
    } else if (userAgent.includes('Edg')) {
      this.browserType = ClientBrowserType.EDGE;
      const match = userAgent.match(/Edg\/(\d+\.\d+)/);
      if (match) {
        this.browserVersion = match[1];
      }
    } else if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
      this.browserType = ClientBrowserType.OPERA;
      const match = userAgent.match(/OPR\/(\d+\.\d+)/) || userAgent.match(/Opera\/(\d+\.\d+)/);
      if (match) {
        this.browserVersion = match[1];
      }
    }

    // Detect system type
    if (userAgent.includes('Windows')) {
      this.systemType = ClientSystemType.WINDOWS;
    } else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) {
      this.systemType = ClientSystemType.MACOS;
    } else if (userAgent.includes('Linux') && !userAgent.includes('Android')) {
      this.systemType = ClientSystemType.LINUX;
    } else if (userAgent.includes('Android')) {
      this.systemType = ClientSystemType.ANDROID;
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iPod')) {
      this.systemType = ClientSystemType.IOS;
    }
  }
}

/**
 * Client connection information for UI display
 */
export interface ClientConnectionInfo {
  clientId: string;
  phase: ConnectionPhase;
  browserType: ClientBrowserType;
  browserVersion: string;
  systemType: ClientSystemType;
  connectionTime: Date;
}
