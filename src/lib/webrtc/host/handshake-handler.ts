import { HostInfo, MessageType, MetaRequest, WebRTCMessage } from '@/lib/webrtc';
import { hostCrypto } from '../crypto';
import { EnhancedConnection } from './enhanced-connection';
import { ConnectionPhase } from './connection';
import { useWebRTCHostStore } from '@/store/webrtcHostStore';

/**
 * Handles the handshake process on the host side.
 * This class is responsible for validating client metadata requests
 * and completing the handshake process.
 */
export class HostHandshakeHandler {
  private hostInfo: HostInfo;
  private connection: EnhancedConnection;
  private mismatchCount: number = 0;
  private readonly MAX_MISMATCH_COUNT = 3;
  
  // Callbacks for handshake events
  private _onHandshakeComplete: (meta: MetaRequest) => void;
  private onHandshakeFailed: (error: string) => void;
  
  constructor(
    connection: EnhancedConnection,
    onHandshakeComplete: (meta: MetaRequest) => void,
    onHandshakeFailed: (error: string) => void
  ) {
    this.hostInfo = new HostInfo();
    this.connection = connection;
    this._onHandshakeComplete = onHandshakeComplete;
    this.onHandshakeFailed = onHandshakeFailed;
    this.handleMessage = this.handleMessage.bind(this);
    this.connection.getConnection().on('data', this.handleMessage);
  }

  async handleMessage(data: unknown) {
    const phase = this.connection.getPhase();
    if (phase !== ConnectionPhase.HANDSHAKING) {
      console.warn(`Unexpected message type during non-handshake phase: ${data}`);
      return;
    }

    const { type, payload, requestId } = await this.connection.deserializeRequest(data as WebRTCMessage);
    
    if (type === MessageType.META_REQUEST) {
      await this.handleMetaRequest(requestId!, payload);
    } else {
      console.warn(`Unexpected message type during handshake phase: ${type}`);
      this.sendError(requestId!, 'Handshake required before other requests');
    }
  }

  /**
   * Handle a meta request during the handshake phase
   */
  async handleMetaRequest(requestId: string, request: MetaRequest) {
    // 获取 API 版本和客户端信息
    const { message } = request;
    this.connection.setMetaInfo(request);

    // 如果不需要加密，则直接返回
    if (message === 'hello' && !hostCrypto.hasKey()) {
      this.onHandshakeComplete(request);
      this.sendMetaResponse(requestId, 'hello');
      return
    }
    // 如果需要加密，则则告知客户端
    if (message === 'hello' && hostCrypto.hasKey()) {
      this.sendMetaResponse(requestId, 'encrypted');
      return
    }

    const isPassphraseValid = await this.checkPassphrase(message)
    
    if (isPassphraseValid) {
      this.onHandshakeComplete(request);
      this.sendMetaResponse(requestId, 'hello');
      return
    }

    if (this.mismatchCount < this.MAX_MISMATCH_COUNT) {
      this.sendMetaResponse(requestId, 'mismatch');
      return
    }

    // TODO 断开连接（或停止接受新连接）
    // TODO 发送错误消息
    this.sendError(requestId, 'Passphrase mismatch');
    this.onHandshakeFailed('Passphrase mismatch');
  }

  private onHandshakeComplete(meta: MetaRequest) {
    this._onHandshakeComplete(meta);
    this.connection.getConnection().off('data', this.handleMessage);
  }

  private async checkPassphrase(message: string): Promise<boolean> {
    const { encrypted, iv } = JSON.parse(message);
    let decrypted = ''
    try {
      decrypted = await hostCrypto.decryptString(encrypted, iv);
    } catch (err: unknown) {
      this.mismatchCount++
    }
    // 判断解密后的内容是否为 hello
    return decrypted === 'hello'
  }

  private sendMetaResponse(requestId: string, message: string) {
    const meta = this.hostInfo.getMeta();
    meta.features.uploadable = useWebRTCHostStore.getState().allowFileUploads;
    const wrtcMessage = {
      type: MessageType.META_RESPONSE,
      payload: {
        ...meta,
        message
      },
      requestId
    };

    this.connection.send(wrtcMessage as WebRTCMessage);
  }
  
  /**
   * Send an error message during handshake
   */
  private sendError(requestId: string, errorMessage: string) {
    const message = {
      type: MessageType.ERROR,
      payload: { error: errorMessage },
      requestId
    };
    
    this.connection.send(message as WebRTCMessage);
  }
}

export default HostHandshakeHandler; 