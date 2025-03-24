import { MessageType, WebRTCMessage, deserializeMessage } from '@/lib/webrtc';
import { clientCrypto } from '@/lib/webrtc/crypto';
import { ConnectionPhase } from './connection';
import { EnhancedConnection } from './enhanced-connection';

// 定义消息处理回调类型
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MessageHandlerCallback = (requestId: string, payload: any) => void;

export class ClientMessageHandler {
  private connection: EnhancedConnection;
  private onError: (error: string) => void;
  private customMessageHandlers: Map<MessageType, MessageHandlerCallback[]> = new Map();
  
  constructor(connection: EnhancedConnection, onError: (error: string) => void) {
    this.connection = connection;
    this.onError = onError;
  }

  startHandleMessage() {
    this.connection.getConnection().on('data', this.handleMessage.bind(this));
  }
  
  /**
   * 注册自定义消息处理器
   * @param messageType 消息类型
   * @param callback 回调函数
   */
  registerMessageHandler(messageType: MessageType, callback: MessageHandlerCallback) {
    if (!this.customMessageHandlers.has(messageType)) {
      this.customMessageHandlers.set(messageType, []);
    }
    this.customMessageHandlers.get(messageType)?.push(callback);
  }
  
  /**
   * 移除自定义消息处理器
   * @param messageType 消息类型
   * @param callback 回调函数
   */
  unregisterMessageHandler(messageType: MessageType, callback: MessageHandlerCallback) {
    if (!this.customMessageHandlers.has(messageType)) return;
    
    const handlers = this.customMessageHandlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
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
    
    let hasHandler = false;
    // 首先检查是否有自定义处理器
    if (this.customMessageHandlers.has(message.type)) {
      const handlers = this.customMessageHandlers.get(message.type);
      if (handlers && handlers.length > 0) {
        const requestId = message.requestId || '';
        handlers.forEach(handler => handler(requestId, message.payload));
        hasHandler = true;
        // 如果是ERROR类型的消息，仍然需要传递给默认处理器
        if (message.type !== MessageType.ERROR) {
          return; // 自定义处理器已处理，不再传递给默认处理器
        }
      }
    }

    if (message.type === MessageType.ERROR) {
      this.onError(message.payload.error);
      hasHandler = true;
      return;
    }

    if (!hasHandler) {
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