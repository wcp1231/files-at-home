import { DataConnection } from 'peerjs';
import { deserializeMessage, MessageType, WebRTCMessage } from '@/lib/webrtc';
import { HostRequestHandler } from './request-handler';
import { HostHandshakeHandler } from './handshake-handler';
import { ConnectionPhase, HostConnectionManager } from './connection';
import { hostCrypto } from '../crypto';

export class HostMessageHandler {
  private connectionManager: HostConnectionManager;
  private requestHandler: HostRequestHandler;
  private setPhaseCallback: (clientId: string, phase: ConnectionPhase) => void;
  
  // Map of client IDs to handshake handlers
  private handshakeHandlers: Map<string, HostHandshakeHandler> = new Map();
  
  constructor(
    connectionManager: HostConnectionManager,
    requestHandler: HostRequestHandler, 
    setPhaseCallback: (clientId: string, phase: ConnectionPhase) => void
  ) {
    this.connectionManager = connectionManager;
    this.requestHandler = requestHandler;
    this.setPhaseCallback = setPhaseCallback;
    
    // Set this messageHandler in the requestHandler
    this.requestHandler.setMessageHandler(this);
  }
  
  /**
   * Set the handshake handler for a specific client
   */
  setHandshakeHandler(clientId: string, handler: HostHandshakeHandler) {
    this.handshakeHandlers.set(clientId, handler);
    this.setPhaseCallback(clientId, ConnectionPhase.HANDSHAKING);
  }
  
  /**
   * Handle a message from a client
   */
  handleMessage(clientId: string, connection: DataConnection, data: any) {
    // Check phase
    const phase = this.connectionManager.getClientPhase(clientId);
    
    // Delegate to phase-specific handler
    switch (phase) {
      case ConnectionPhase.HANDSHAKING:
        this.handleHandshakePhaseMessage(clientId, connection, data);
        break;
      
      case ConnectionPhase.ACTIVE:
        this.handleActivePhaseMessage(clientId, connection, data);
        break;
        
      case ConnectionPhase.DISCONNECTED:
        console.warn(`Received message from DISCONNECTED client ${clientId}`);
        break;
        
      default:
        console.warn(`Unknown connection phase for client ${clientId}: ${phase}`);
    }
  }

  /**
   * Send a response message
   * Used by the request handler
   */
  async sendResponse(conn: DataConnection, message: any) {
    conn.send(await this.serializeResponse(message));
  }
  
  /**
   * Handle messages during handshake phase
   */
  private async handleHandshakePhaseMessage(clientId: string, connection: DataConnection, data: any) {
    const { type, payload, requestId } = await this.deserializeRequest(data);
    
    if (type === MessageType.META_REQUEST) {
      const handler = this.handshakeHandlers.get(clientId);
      if (handler) {
        await handler.handleMetaRequest(requestId!, payload);
      } else {
        console.warn(`No handshake handler for client ${clientId}`);
        this.sendError(connection, requestId, 'Server error: Handshake handler not available');
      }
    } else {
      console.warn(`Unexpected message type during handshake phase: ${type}`);
      this.sendError(connection, requestId, 'Handshake required before other requests');
    }
  }
  
  /**
   * Handle messages during active phase
   */
  private async handleActivePhaseMessage(clientId: string, connection: DataConnection, data: any) {
    const { type, payload, requestId } = await this.deserializeRequest(data);
    
    switch (type) {
      case MessageType.DIRECTORY_REQUEST:
        this.requestHandler.handleDirectoryRequest(connection, payload.path, requestId);
        break;
      
      case MessageType.FILE_INFO_REQUEST:
        this.requestHandler.handleFileRequest(connection, payload.path, requestId);
        break;
      
      case MessageType.FILE_TRANSFER_REQUEST:
        this.requestHandler.handleFileTransferRequest(connection, payload, requestId);
        break;
      
      case MessageType.FILE_CHUNK_REQUEST:
        this.requestHandler.handleFileChunkRequest(connection, payload, requestId);
        break;
        
      default:
        console.warn(`Unexpected message type: ${type}`);
        this.sendError(connection, requestId, `Unsupported request type: ${type}`);
    }
  }

  private async serializeResponse(message: WebRTCMessage) {
    // 如果还没有密钥，则不加密
    if (!hostCrypto.hasKey()) {
      return JSON.stringify(message);
    }

    const encodedPlaintext = JSON.stringify(message);
    const { encrypted, iv } = await hostCrypto.encryptString(encodedPlaintext);
    const encryptedMessage = {
      type: MessageType.ENCRYPTED_RESPONSE,
      payload: { encrypted, iv }
    };
    return JSON.stringify(encryptedMessage);
  }

  private async deserializeRequest(data: string) {
    const message = deserializeMessage(data);
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
   * Send error response
   */
  private sendError(connection: DataConnection, requestId: string | undefined, error: string) {
    if (!requestId) return;
    
    const message = {
      type: MessageType.ERROR,
      payload: { error },
      requestId
    };
    
    connection.send(JSON.stringify(message));
  }
} 