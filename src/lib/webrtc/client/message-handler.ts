import { DataConnection } from 'peerjs';
import { MessageType, WebRTCMessage, deserializeMessage } from '@/lib/webrtc';
import { ClientRequestManager } from './request-manager';
import { clientCrypto } from '../crypto';
import { ConnectionPhase } from './connection';
import { HandshakeManager } from './handshake-manager';

export class ClientMessageHandler {
  private requestManager: ClientRequestManager;
  private handshakeManager: HandshakeManager;
  private onError: (error: string) => void;
  private currentPhase: ConnectionPhase = ConnectionPhase.DISCONNECTED;
  
  constructor(requestManager: ClientRequestManager, handshakeManager: HandshakeManager, onError: (error: string) => void) {
    this.requestManager = requestManager;
    this.requestManager.setMessageHandler(this);
    this.handshakeManager = handshakeManager;
    this.onError = onError;
  }
  
  // Set the handshake manager
  setHandshakeManager(handshakeManager: HandshakeManager) {
    this.handshakeManager = handshakeManager;
  }
  
  // Set the current connection phase
  setPhase(phase: ConnectionPhase) {
    console.log(`Message handler phase changed to: ${ConnectionPhase[phase]}`);
    this.currentPhase = phase;
  }
  
  // Handle incoming messages based on the current phase
  async handleMessage(conn: DataConnection, message: WebRTCMessage) {
    try {
      // Handle messages according to the current phase
      if (this.currentPhase === ConnectionPhase.HANDSHAKING) {
        await this.handleHandshakePhaseMessage(conn, message);
      } else if (this.currentPhase === ConnectionPhase.ACTIVE) {
        await this.handleActivePhaseMessage(conn, message);
      } else {
        console.warn('Received message in unexpected phase:', ConnectionPhase[this.currentPhase]);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }
  
  // Handle messages during handshake phase
  private async handleHandshakePhaseMessage(conn: DataConnection, data: WebRTCMessage) {
    const message = await this.deserializeResponse(data);
    // During handshake, we only care about META_RESPONSE and ERROR messages
    switch (message.type) {
      case MessageType.META_RESPONSE:
        this.handshakeManager.handleMetaResponse(message.requestId!, message.payload);
        break;
        
      case MessageType.ERROR:
        this.handshakeManager.handleErrorResponse(message.requestId!, message.payload);
        break;
        
      default:
        console.log('Ignored message during handshake phase:', message.type);
    }
  }
  
  // Handle messages during active phase
  private async handleActivePhaseMessage(conn: DataConnection, data: WebRTCMessage) {
    const message = await this.deserializeResponse(data);
    switch (message.type) {
      case MessageType.FILE_INFO_RESPONSE:
        this.requestManager.handleFileInfoResponse(message.requestId!, message.payload);
        break;
          
      case MessageType.DIRECTORY_RESPONSE:
        this.requestManager.handleDirectoryResponse(message.requestId!, message.payload);
        break;
          
      case MessageType.FILE_TRANSFER_RESPONSE:
        this.requestManager.handleFileTransferResponse(message.requestId!, message.payload);
        break;
          
      case MessageType.FILE_CHUNK_RESPONSE:
        this.requestManager.handleFileChunkResponse(message.requestId!, message.payload);
        break;
          
      case MessageType.FILE_TRANSFER_CANCEL:
        if (message.payload && message.payload.fileId) {
          this.requestManager.cancelFileTransfer(message.payload.fileId);
        }
        break;

      case MessageType.ERROR:
        this.requestManager.handleErrorResponse(message.requestId!, message.payload);
        this.onError(message.payload.error);
        break;
        
      default:
        console.log('Unhandled message type:', message.type);
    }
  }

  async sendRequest(conn: DataConnection, message: WebRTCMessage) {
    // Regular requests should only be sent in active phase
    if (this.currentPhase !== ConnectionPhase.ACTIVE && message.type !== MessageType.META_REQUEST) {
      console.warn(`Attempted to send ${message.type} message while not in ACTIVE phase`);
      // Allow it to continue anyway, but log the warning
    }
    
    conn.send(await this.serializeRequest(message));
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

  private async deserializeResponse(message: WebRTCMessage) {
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
}

export default ClientMessageHandler; 