import { MessageType, WebRTCMessage, deserializeMessage } from '@/lib/webrtc';
import { clientCrypto } from '../crypto';
import { ConnectionPhase } from './connection';
import { EnhancedConnection } from './enhanced-connection';
import { ClientRequestManager } from './request-manager';

export class ClientMessageHandler {
  private connection: EnhancedConnection;
  private requestManager: ClientRequestManager;
  private onError: (error: string) => void;
  
  constructor(connection: EnhancedConnection, onError: (error: string) => void) {
    this.connection = connection;
    this.requestManager = connection.getRequestManager();
    this.onError = onError;
  }

  startHandleMessage() {
    this.connection.getConnection().on('data', this.handleMessage.bind(this));
  }
  
  // Handle incoming messages based on the current phase
  async handleMessage(message: unknown) {
    const phase = this.connection.getPhase();
    try {
      // Handle messages according to the current phase
      if (phase === ConnectionPhase.ACTIVE) {
        await this.handleActivePhaseMessage(message as WebRTCMessage);
      } else {
        console.warn('Received message in unexpected phase:', ConnectionPhase[phase]);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }
  
  // Handle messages during active phase
  private async handleActivePhaseMessage(data: WebRTCMessage) {
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